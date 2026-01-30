import React, { useRef, useState, useEffect } from 'react';
import { attendanceApi } from '../services/api';
import '../styles/components.css';

const AttendanceScanner = ({ service, onCheckinSuccess }) => {
  const videoRef = useRef(null);
  const [scannedValue, setScannedValue] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [cameraActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      setMessage('Error accessing camera');
      setMessageType('error');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
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
                className="video-stream"
              />
              <button
                className="btn btn-secondary"
                onClick={() => setCameraActive(false)}
              >
                Stop Camera
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setCameraActive(true)}
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
          <button className="btn btn-success" onClick={handleManualScan}>
            Check In
          </button>
        </div>

        {message && (
          <div className={`message message-${messageType}`}>{message}</div>
        )}
      </div>
    </div>
  );
};

export default AttendanceScanner;
