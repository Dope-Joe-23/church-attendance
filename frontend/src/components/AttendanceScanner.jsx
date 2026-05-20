import React, { useRef, useState, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import { attendanceApi } from '../services/api';
import '../styles/components.css';

const INACTIVITY_TIMEOUT_MS = 30 * 1000; // 30 seconds
const SCAN_INTERVAL_MS = 100; // Check for QR codes up to 10 times per second
const MAX_SCAN_WIDTH = 640; // Downscale frames before decoding for faster scans
const DUPLICATE_SCAN_WINDOW_MS = 1500;

const AttendanceScanner = ({ service, onCheckinSuccess }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasContextRef = useRef(null);
  const scanningFrameRef = useRef(null);
  const lastScanAttemptRef = useRef(0);
  const processingScanRef = useRef(false);
  const cameraStartRequestedRef = useRef(false);
  const inactivityTimeoutRef = useRef(null);
  const lastScannedRef = useRef(null);

  const [scannedValue, setScannedValue] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [cameraActive, setCameraActive] = useState(false);

  function resetInactivityTimeout() {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    inactivityTimeoutRef.current = setTimeout(() => {
      console.log('Inactivity timeout - closing camera');
      setMessage('Camera closed due to inactivity (30 seconds)');
      setMessageType('info');
      stopCamera();
      setCameraActive(false);
    }, INACTIVITY_TIMEOUT_MS);
  }

  function detectQRCode(scanTimestamp) {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvasContextRef.current || canvas.getContext('2d', { willReadFrequently: true });
    canvasContextRef.current = context;

    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
    if (!video.videoWidth || !video.videoHeight) return;

    const scale = Math.min(1, MAX_SCAN_WIDTH / video.videoWidth);
    const scanWidth = Math.round(video.videoWidth * scale);
    const scanHeight = Math.round(video.videoHeight * scale);

    if (canvas.width !== scanWidth || canvas.height !== scanHeight) {
      canvas.width = scanWidth;
      canvas.height = scanHeight;
    }

    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    } catch (error) {
      console.error('Error drawing image to canvas:', error);
      return;
    }

    try {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (!code?.data) return;

      console.log('QR Code detected:', code.data);

      const lastTime = lastScannedRef.current?.time || 0;
      const isDuplicate =
        lastScannedRef.current?.value === code.data && scanTimestamp - lastTime < DUPLICATE_SCAN_WINDOW_MS;

      if (isDuplicate || processingScanRef.current) return;

      lastScannedRef.current = { value: code.data, time: scanTimestamp };
      processingScanRef.current = true;
      resetInactivityTimeout();

      handleQRCodeDetected(code.data).finally(() => {
        processingScanRef.current = false;
      });
    } catch (error) {
      console.error('Error processing QR code:', error);
    }
  }

  function scanLoop(timestamp) {
    if (!videoRef.current?.srcObject) return;

    if (timestamp - lastScanAttemptRef.current >= SCAN_INTERVAL_MS) {
      lastScanAttemptRef.current = timestamp;
      detectQRCode(timestamp);
    }

    scanningFrameRef.current = requestAnimationFrame(scanLoop);
  }

  async function startCamera() {
    try {
      console.log('Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        cameraStartRequestedRef.current = false;
        console.log('Camera started, stream active');

        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, starting QR detection');

          if (scanningFrameRef.current) {
            cancelAnimationFrame(scanningFrameRef.current);
          }

          videoRef.current.play?.();
          lastScanAttemptRef.current = 0;
          scanningFrameRef.current = requestAnimationFrame(scanLoop);
          resetInactivityTimeout();
          setMessage('Camera ready - point at QR code');
          setMessageType('success');
        };
      }
    } catch (error) {
      console.error('Camera error:', error);
      cameraStartRequestedRef.current = false;
      setMessage(`Camera error: ${error.message}`);
      setMessageType('error');
      setCameraActive(false);
    }
  }

  function stopCamera() {
    console.log('Stopping camera...');

    if (scanningFrameRef.current) {
      cancelAnimationFrame(scanningFrameRef.current);
      scanningFrameRef.current = null;
    }

    processingScanRef.current = false;
    cameraStartRequestedRef.current = false;
    lastScanAttemptRef.current = 0;

    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      console.log(`Stopping ${tracks.length} tracks...`);
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    console.log('Camera fully stopped');
  }

  async function handleQRCodeDetected(memberID) {
    console.log('QR code detected, processing:', memberID);

    if (!service) {
      const errorMsg = 'Please select a service first';
      setMessage(errorMsg);
      setMessageType('error');
      console.warn(errorMsg);
      return;
    }

    if (service.is_recurring && !service.parent_service && !service.date) {
      const errorMsg = `"${service.name}" is a recurring service template. Please select a specific session/date to check in.`;
      setMessage(errorMsg);
      setMessageType('error');
      stopCamera();
      setCameraActive(false);
      console.warn(errorMsg);
      return;
    }

    try {
      console.log(`Checking in member: ${memberID} for service: ${service.id}`);
      const result = await attendanceApi.checkInMember(memberID, service.id);

      console.log('Check-in result:', result);
      setMessageType(result.success ? 'success' : 'info');
      setMessage(result.message);

      if (result.success && onCheckinSuccess) {
        onCheckinSuccess(result.attendance);
      }

      if (result.success || result.message?.includes('already checked in')) {
        resetInactivityTimeout();
      }

      if (result.message?.includes('Attendance for this service has been taken')) {
        console.log('Attendance closed - stopping camera');
        stopCamera();
        setCameraActive(false);
      }
    } catch (error) {
      console.error('Check-in error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Check-in failed';
      setMessage(errorMsg);
      setMessageType('error');
    }
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleManualScan = async () => {
    if (!scannedValue.trim()) {
      setMessage('Please enter a member ID');
      setMessageType('error');
      return;
    }

    if (!service) {
      setMessage('Please select a service first');
      setMessageType('error');
      return;
    }

    if (service.is_recurring && !service.parent_service && !service.date) {
      setMessage(`"${service.name}" is a recurring service template. Please select a specific session/date to check in.`);
      setMessageType('error');
      return;
    }

    try {
      const result = await attendanceApi.checkInMember(scannedValue, service.id);
      setMessageType(result.success ? 'success' : 'info');
      setMessage(result.message);
      setScannedValue('');

      if (result.success && onCheckinSuccess) {
        onCheckinSuccess(result.attendance);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Check-in failed');
      setMessageType('error');
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleManualScan();
    }
  };

  const handleStartCamera = () => {
    cameraStartRequestedRef.current = true;
    setCameraActive(true);
  };

  const handleStopCamera = () => {
    stopCamera();
    setCameraActive(false);
  };

  const attachVideoRef = useCallback((node) => {
    videoRef.current = node;

    if (node && cameraStartRequestedRef.current && !node.srcObject) {
      startCamera();
    }
    // Keep this callback stable so React does not detach/reattach the video ref
    // during message updates after each scan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="scanner-container">
      <div className="scanner-content">
        {!service && (
          <div className="message message-warning" style={{ marginBottom: '20px' }}>
            Please select a service first before scanning
          </div>
        )}

        {service && (
          <div className="service-info-panel">
            <p>
              <strong>Date:</strong> {new Date(service.date).toLocaleDateString()}
            </p>
          </div>
        )}

        {message && <div className={`message message-${messageType}`}>{message}</div>}

        <div className="camera-container">
          {cameraActive ? (
            <>
              <video
                ref={attachVideoRef}
                autoPlay
                playsInline
                muted
                className="video-stream"
                style={{
                  width: '100%',
                  maxWidth: '500px',
                  borderRadius: '8px',
                  border: '2px solid #007bff',
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <button
                className="btn btn-secondary"
                onClick={handleStopCamera}
                style={{ marginTop: '15px' }}
              >
                Stop Camera
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={handleStartCamera} disabled={!service}>
              Start Camera
            </button>
          )}
        </div>

        <div className="manual-input">
          <label>
            Or enter member ID manually:
            <input
              type="text"
              value={scannedValue}
              onChange={(event) => setScannedValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter member ID"
              className="input-field"
            />
          </label>
          <button className="btn btn-success" onClick={handleManualScan} disabled={!service}>
            Check In
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceScanner;
