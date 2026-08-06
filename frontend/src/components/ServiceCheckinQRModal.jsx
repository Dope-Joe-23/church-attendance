import React, { useState, useEffect } from 'react';
import { serviceApi } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import '../styles/checkin.css';

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (time) => {
  if (!time) return '—';
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const ServiceCheckinQRModal = ({ isOpen, service, onClose }) => {
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  const loadQR = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const data = await serviceApi.getServiceCheckinQR(service.id);
      setQr(data);
    } catch (err) {
      setQr(null);
      setError(err.response?.data?.error || 'Failed to load the check-in QR code.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && service) {
      // Fetch-on-open is intentional: load the QR whenever the modal opens
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadQR();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, service?.id]);

  if (!isOpen || !service) return null;

  const handleRotate = async () => {
    if (
      !window.confirm(
        'Rotating the token will invalidate the currently printed QR code. Make sure you print the new one before Sunday. Continue?'
      )
    ) {
      return;
    }
    setRotating(true);
    setError(null);
    try {
      const data = await serviceApi.rotateServiceCheckinToken(service.id);
      setQr(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to regenerate the QR code.');
    } finally {
      setRotating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qr.checkin_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    if (!qr) return;
    const link = document.createElement('a');
    link.href = qr.qr_code_image;
    link.download = `checkin-qr-${service.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!qr) return;
    const serviceTime = [formatTime(service.start_time), formatTime(service.end_time)]
      .filter((t) => t !== '—')
      .join(' – ');

    const printWindow = window.open('', '_blank', 'width=520,height=680');
    printWindow.document.write(`
      <html>
        <head>
          <title>Self Check-In QR — ${service.name}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: Arial, Helvetica, sans-serif;
              background: #fff;
              margin: 0;
              padding: 24px;
            }
            .badge {
              display: inline-block;
              background: #24106a;
              color: #fff;
              padding: 6px 16px;
              border-radius: 999px;
              font-size: 13px;
              letter-spacing: 0.06em;
              text-transform: uppercase;
              margin-bottom: 12px;
            }
            h1 { margin: 0 0 4px; color: #1f2937; font-size: 26px; }
            .meta { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
            img {
              max-width: 360px;
              width: 100%;
              border: 3px solid #e5e7eb;
              border-radius: 14px;
              padding: 12px;
              background: #fff;
            }
            .instructions {
              margin-top: 18px;
              color: #374151;
              font-size: 15px;
              text-align: center;
              line-height: 1.5;
              max-width: 340px;
            }
          </style>
        </head>
        <body>
          <span class="badge">Scan to Check In</span>
          <h1>${service.name}</h1>
          <p class="meta">${formatDate(service.date)} • ${serviceTime}${service.location ? ` • ${service.location}` : ''}</p>
          <img src="${qr.qr_code_image}" alt="Self check-in QR code" />
          <p class="instructions">
            Point your phone camera at this code, then type your <strong>Member ID</strong> to check in.
            No account needed.
          </p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-content">
            <span className="scanner-modal-kicker">Self check-in QR</span>
            <h2>{service.name}</h2>
            <div className="scanner-modal-meta">
              <span>{formatDate(service.date)}</span>
              <span>
                {[formatTime(service.start_time), formatTime(service.end_time)]
                  .filter((t) => t !== '—')
                  .join(' – ')}
              </span>
              {service.location && <span>{service.location}</span>}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="checkin-loading">
              <LoadingSpinner message="Generating QR code..." />
            </div>
          )}

          {!loading && error && (
            <div className="checkin-error-state">
              <div style={{ fontSize: '2.2rem' }}>⚠️</div>
              <h2>QR not available</h2>
              <p>{error}</p>
            </div>
          )}

          {!loading && qr && (
            <div className="checkin-qr-display">
              <img src={qr.qr_code_image} alt="Self check-in QR code" className="checkin-qr-image" />

              <div className="checkin-qr-url-box">
                <code>{qr.checkin_url}</code>
                <button type="button" className="checkin-copy-btn" onClick={handleCopy}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              <p className="checkin-qr-hint">
                Print this QR and post it at the church entrance. Members scan it with their phone
                camera, then type their <strong>Member ID</strong> to check in — no account required.
              </p>

              {rotating && (
                <div className="checkin-alert checkin-alert-info">Regenerating QR code...</div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="modal-actions-group">
            <div className="modal-actions-section">
              <h4 className="modal-actions-label">Use</h4>
              <button className="btn btn-secondary" onClick={handlePrint} disabled={!qr || loading}>
                🖨️ Print
              </button>
              <button className="btn btn-secondary" onClick={handleDownload} disabled={!qr || loading}>
                📥 Download
              </button>
            </div>
            <div className="modal-actions-divider"></div>
            <div className="modal-actions-section checkin-qr-rotate">
              <h4 className="modal-actions-label">Security</h4>
              <button className="btn btn-warning" onClick={handleRotate} disabled={!qr || loading || rotating}>
                🔄 Rotate Code
              </button>
            </div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceCheckinQRModal;
