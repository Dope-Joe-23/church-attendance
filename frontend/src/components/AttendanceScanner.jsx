import React, { useRef, useState, useEffect } from 'react';
import jsQR from 'jsqr';
import { attendanceApi } from '../services/api';
import '../styles/components.css';

const AttendanceScanner = ({ service, onCheckinSuccess }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scannedValue, setScannedValue] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [detectionActive, setDetectionActive] = useState(false);
  const [lastDetectionTime, setLastDetectionTime] = useState(null);
  const scanningIntervalRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);
  const lastScannedRef = useRef(null);

  // Configuration
  const INACTIVITY_TIMEOUT_MS = 30 * 1000; // 30 seconds
  const SCAN_INTERVAL_MS = 500; // Check for QR codes every 500ms

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    }
    return () => {
      // Cleanup when component unmounts or camera is closed
      stopCamera();
    };
  }, [cameraActive]);

  // Reset inactivity timeout
  const resetInactivityTimeout = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    inactivityTimeoutRef.current = setTimeout(() => {
      console.log('⏱️ Inactivity timeout - closing camera');
      setMessage('Camera closed due to inactivity (30 seconds)');
      setMessageType('info');
      stopCamera(); // Call stopCamera directly
      setCameraActive(false);
    }, INACTIVITY_TIMEOUT_MS);
  };

  // Detect QR code from video frame
  const detectQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    // Check if video is ready and has dimensions
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;
    if (!video.videoWidth || !video.videoHeight) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    } catch (e) {
      console.error('Error drawing image to canvas:', e);
      return;
    }

    // Get image data and detect QR code
    try {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      // Update detection status every frame
      setDetectionActive(true);
      setLastDetectionTime(Date.now());

      if (code && code.data) {
        console.log('✓ QR Code DETECTED:', code.data);
        
        // Avoid duplicate scans - check both value and time
        const now = Date.now();
        const lastTime = lastScannedRef.current?.time || 0;
        const isDuplicate = lastScannedRef.current?.value === code.data && (now - lastTime < 2000);
        
        if (!isDuplicate) {
          lastScannedRef.current = { value: code.data, time: now };
          console.log('✓ Processing QR code:', code.data);
          handleQRCodeDetected(code.data);
          resetInactivityTimeout();
        }
      }
    } catch (e) {
      console.error('Error processing QR code:', e);
    }
  };

  const startCamera = async () => {
    try {
      console.log('Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('Camera started, stream active');
        
        // Wait for video to load before starting detection
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, starting QR detection');
          if (scanningIntervalRef.current) {
            clearInterval(scanningIntervalRef.current);
          }
          scanningIntervalRef.current = setInterval(detectQRCode, SCAN_INTERVAL_MS);
          resetInactivityTimeout();
          setMessage('Camera ready - point at QR code');
          setMessageType('success');
        };
      }
    } catch (error) {
      console.error('Camera error:', error);
      setMessage(`Camera error: ${error.message}`);
      setMessageType('error');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    console.log('⏹️ Stopping camera...');
    
    // Stop scanning interval
    if (scanningIntervalRef.current) {
      clearInterval(scanningIntervalRef.current);
      scanningIntervalRef.current = null;
    }
    
    // Clear inactivity timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
    
    // Stop video stream - this is critical to turn off the light
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      console.log(`Stopping ${tracks.length} tracks...`);
      tracks.forEach((track) => {
        track.stop();
        console.log(`✓ Stopped ${track.kind} track`);
      });
      videoRef.current.srcObject = null; // Clear the stream
    }
    
    console.log('✓ Camera fully stopped');
  };

  const handleQRCodeDetected = async (memberID) => {
    console.log('QR code detected, processing:', memberID);
    
    if (!service) {
      const errorMsg = 'Please select a service first';
      setMessage(errorMsg);
      setMessageType('error');
      console.warn(errorMsg);
      return;
    }

    // Prevent checking in to parent recurring services (template/label only)
    // Parent services have: is_recurring=true, parent_service=null, date=null
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

      // Close camera on successful check-in OR if already checked in
      if (result.success || result.message?.includes('already checked in')) {
        console.log('🎉 Check-in complete - stopping camera immediately');
        stopCamera(); // Stop immediately, don't wait for state update
        setCameraActive(false);
        if (result.success && onCheckinSuccess) {
          onCheckinSuccess(result.attendance);
        }
      }
    } catch (error) {
      console.error('Check-in error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Check-in failed';
      setMessage(errorMsg);
      setMessageType('error');
    }
  };

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

    // Prevent checking in to parent recurring services (template/label only)
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleManualScan();
    }
  };

  return (
    <div className="scanner-container">
      <div className="scanner-content">
        <h2>Attendance Scanner</h2>
        
        {!service && (
          <div className="message message-warning" style={{ marginBottom: '20px' }}>
            ⚠️ Please select a service first before scanning
          </div>
        )}
        
        {service && (
          <div className="service-info-panel">
            <p>
              <strong>Service:</strong> {service.name}
            </p>
            <p>
              <strong>Date:</strong> {new Date(service.date).toLocaleDateString()}
            </p>
          </div>
        )}

        <div className="camera-container">
          {cameraActive ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="video-stream"
                style={{ 
                  width: '100%', 
                  maxWidth: '500px',
                  borderRadius: '8px',
                  border: '2px solid #007bff'
                }}
              />
              <canvas 
                ref={canvasRef} 
                style={{ display: 'none' }} 
              />
              <button
                className="btn btn-secondary"
                onClick={() => setCameraActive(false)}
                style={{ marginTop: '15px' }}
              >
                Stop Camera
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setCameraActive(true)}
              disabled={!service}
            >
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
              onChange={(e) => setScannedValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter member ID"
              className="input-field"
            />
          </label>
          <button 
            className="btn btn-success" 
            onClick={handleManualScan}
            disabled={!service}
          >
            Check In
          </button>
        </div>

        {message && (
          <div className={`message message-${messageType}`}>{message}</div>
        )}
        
        {/* Debug Info - Optional */}
        {cameraActive && (
          <div style={{ 
            marginTop: '20px', 
            fontSize: '12px', 
            color: '#666',
            padding: '10px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}>
            <p style={{ margin: '5px 0' }}>
              🔍 Scanner active - detecting QR codes...
            </p>
            <p style={{ margin: '5px 0', color: detectionActive ? '#28a745' : '#dc3545' }}>
              {detectionActive ? '✓ Detection running' : '✗ Waiting for video...'}
            </p>
            <p style={{ margin: '5px 0' }}>
              📍 Position QR code in frame for 1-2 seconds
            </p>
            <p style={{ margin: '5px 0', fontSize: '11px', color: '#999' }}>
              Check browser console (F12) for detailed logs
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceScanner;
