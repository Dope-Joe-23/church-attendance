import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicCheckinApi } from '../services/api';
import wisLogo from '../assets/wis_logo.jpg';
import '../styles/checkin.css';

const formatDate = (date) => {
  if (!date) return '—';
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
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

const PublicCheckIn = () => {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [memberId, setMemberId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [memberMatch, setMemberMatch] = useState(null); // { full_name, member_id } | { error }
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await publicCheckinApi.getInfo(token);
        if (!cancelled) {
          setInfo(data);
        }
      } catch (err) {
        if (!cancelled) {
          setInfo(null);
          setLoadError(err.response?.data?.error || 'Unable to load this check-in page. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Pre-check-in confirmation: as soon as 4 digits are typed, look up the member
  // and show "Is this you?" so nobody checks in the wrong person.
  useEffect(() => {
    if (!info || memberId.length !== 4) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLookingUp(true);
      setMemberMatch(null);
      try {
        const data = await publicCheckinApi.getInfo(token, memberId);
        if (!cancelled) {
          setMemberMatch(data.member_match || { error: 'No member found with this number.' });
        }
      } catch {
        if (!cancelled) setMemberMatch({ error: 'Could not verify member. Please try again.' });
      } finally {
        if (!cancelled) setLookingUp(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [memberId, token, info]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!memberId.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const data = await publicCheckinApi.checkIn(token, memberId.trim());
      if (data.success) {
        setResult({
          success: true,
          title: "You're checked in!",
          message: data.message || 'Attendance recorded successfully.',
        });
        setMemberId('');
        setMemberMatch(null);
      } else {
        setResult({
          success: false,
          title: 'Not checked in',
          message: data.message || data.error || 'Unable to check in.',
        });
      }
    } catch (err) {
      setResult({
        success: false,
        title: 'Unable to check in',
        message:
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.response?.data?.detail ||
          'Something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const service = info?.service || null;
  const showForm = info && info.valid && info.checkin_open && !info.attendance_taken;
  const memberFound = !!memberMatch?.full_name;
  const canSubmit = memberId.length === 4 && memberFound && !lookingUp && !submitting;

  return (
    <div className="public-checkin-page">
      <div className="checkin-card">
        <div className="checkin-card-header">
          <span className="church-badge"><img src={wisLogo} alt="WIS" style={{height: '14px', verticalAlign: 'middle', marginRight: '4px', borderRadius: '2px'}} /> {info?.church_name || 'Church'}</span>
          <h1>Self Check-In</h1>
          <p>Scan &amp; check in — no account needed</p>
        </div>

        <div className="checkin-card-body">
          {loading && (
            <div className="checkin-loading">
              <p>Loading service details...</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="checkin-error-state">
              <div style={{ fontSize: '2.4rem' }}>📵</div>
              <h2>Check-in unavailable</h2>
              <p>{loadError}</p>
            </div>
          )}

          {!loading && info && info.valid === false && (
            <div className="checkin-error-state">
              <div style={{ fontSize: '2.4rem' }}>⚠️</div>
              <h2>Invalid check-in code</h2>
              <p>{info.error || 'This QR code is no longer valid. Please scan the code posted at the church.'}</p>
            </div>
          )}

          {!loading && info && info.valid && service && (
            <>
              <h2 className="checkin-service-name">{service.name}</h2>

              <div className="checkin-service-meta">
                <div className="checkin-meta-item full-width">
                  <span className="label">Date</span>
                  <span className="value">{formatDate(service.date)}</span>
                </div>
                <div className="checkin-meta-item">
                  <span className="label">Starts</span>
                  <span className="value">{formatTime(service.start_time)}</span>
                </div>
                <div className="checkin-meta-item">
                  <span className="label">Ends</span>
                  <span className="value">{formatTime(service.end_time)}</span>
                </div>
                {service.location && (
                  <div className="checkin-meta-item full-width">
                    <span className="label">Location</span>
                    <span className="value">📍 {service.location}</span>
                  </div>
                )}
              </div>

              {info.attendance_taken ? (
                <div className="checkin-status-pill checkin-status-taken">
                  ✋ Attendance has already been recorded for this service
                </div>
              ) : info.checkin_open ? (
                <div className="checkin-status-pill checkin-status-open">
                  🟢 Check-in is open
                </div>
              ) : (
                <div className="checkin-status-pill checkin-status-closed">
                  🕐 {info.checkin_message}
                </div>
              )}

              {showForm && (
                <>
                  {result && (
                    <div className={`checkin-alert ${result.success ? 'checkin-alert-success' : 'checkin-alert-error'}`}>
                      {result.success && <div className="checkin-success-badge">✅</div>}
                      <strong>{result.title}</strong>
                      <div>{result.message}</div>
                    </div>
                  )}

                  {!result?.success && (
                    <form onSubmit={handleSubmit}>
                      <label htmlFor="checkin-member-id">Last 4 digits of your Member ID</label>
                      <input
                        id="checkin-member-id"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        className="checkin-id-input"
                        placeholder="e.g. 0001"
                        value={memberId}
                        onChange={(e) => {
                          const next = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setMemberId(next);
                          if (next.length !== 4) setMemberMatch(null);
                        }}
                        disabled={submitting}
                        autoComplete="off"
                        autoFocus
                      />

                      {lookingUp && (
                        <p className="checkin-form-hint" style={{ marginTop: '0.5rem' }}>
                          Looking up member…
                        </p>
                      )}

                      {!lookingUp && memberMatch?.full_name && (
                        <div className="checkin-confirm">
                          <div className="checkin-confirm-avatar">👤</div>
                          <div className="checkin-confirm-text">
                            <p className="checkin-confirm-question">Is this you?</p>
                            <p className="checkin-confirm-name">{memberMatch.full_name}</p>
                            <p className="checkin-confirm-note">Not you? Edit the number above.</p>
                          </div>
                        </div>
                      )}

                      {!lookingUp && memberMatch?.error && memberId.length === 4 && (
                        <div className="checkin-alert checkin-alert-error" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                          {memberMatch.error}
                        </div>
                      )}

                      <button type="submit" className="checkin-submit-btn" disabled={!canSubmit}>
                        {submitting ? 'Checking in…' : memberFound ? "✓ Yes, Check Me In" : '✓ Check In'}
                      </button>
                      <p className="checkin-form-hint">
                        The last 4 digits of your Member ID are printed on your membership card (e.g. 0001).
                      </p>
                    </form>
                  )}

                  {result?.success && (
                    <button
                      type="button"
                      className="checkin-another-btn"
                      onClick={() => {
                        setResult(null);
                        setMemberMatch(null);
                      }}
                    >
                      Check in another member
                    </button>
                  )}
                </>
              )}

              {info.valid && !info.checkin_open && !info.attendance_taken && (
                <div className="checkin-alert checkin-alert-info">
                  Check-in for this service will open 30 minutes before the start time and
                  close shortly after the service ends.
                </div>
              )}
            </>
          )}
        </div>

        <div className="checkin-card-footer">
          <p>Wesleyan International Society — Sunyani</p>
        </div>
      </div>
    </div>
  );
};

export default PublicCheckIn;
