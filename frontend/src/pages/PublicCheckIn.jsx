import React, { useState, useEffect, useRef } from 'react';
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

  // Tab state: 'id' for Member ID input, 'search' for name search
  const [activeTab, setActiveTab] = useState('search');

  // Member ID input state (existing flow)
  const [memberId, setMemberId] = useState('');

  // Name search state (new flow)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Shared state
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [memberMatch, setMemberMatch] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);

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
    return () => { cancelled = true; };
  }, [token]);

  // Pre-check-in confirmation for Member ID tab: as soon as 4 digits are typed, look up the member
  useEffect(() => {
    if (activeTab !== 'id' || !info || memberId.length !== 4) return;
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
  }, [memberId, token, info, activeTab]);

  // Live search: debounce and fetch matching members
  useEffect(() => {
    if (activeTab !== 'search' || !info) return;
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSelectedMember(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await publicCheckinApi.getInfo(token, null, searchQuery.trim());
        if (!cancelled) {
          setSearchResults(data.search_results || []);
        }
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, token, info, activeTab]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
        // Don't close if clicking the input itself
        if (searchInputRef.current && searchInputRef.current.contains(e.target)) return;
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setSearchQuery(member.full_name);
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const idToSubmit = activeTab === 'id' ? memberId.trim() : selectedMember?.member_id;
    if (!idToSubmit) return;
    setSubmitting(true);
    setResult(null);
    try {
      const data = await publicCheckinApi.checkIn(token, idToSubmit);
      if (data.success) {
        setResult({
          success: true,
          title: "You're checked in!",
          message: data.message || 'Attendance recorded successfully.',
        });
        setMemberId('');
        setMemberMatch(null);
        setSearchQuery('');
        setSelectedMember(null);
        setSearchResults([]);
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

  const handleReset = () => {
    setResult(null);
    setMemberMatch(null);
    setSelectedMember(null);
    setSearchQuery('');
    setSearchResults([]);
    setMemberId('');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setResult(null);
    setMemberMatch(null);
    setSelectedMember(null);
    setSearchQuery('');
    setSearchResults([]);
    setMemberId('');
  };

  const service = info?.service || null;
  const showForm = info && info.valid && info.checkin_open && !info.attendance_taken;

  // Determine if submit is allowed
  let canSubmit = false;
  if (!submitting && showForm) {
    if (activeTab === 'id') {
      const memberFound = !!memberMatch?.full_name;
      canSubmit = memberId.length === 4 && memberFound && !lookingUp;
    } else {
      canSubmit = !!selectedMember;
    }
  }

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
                    <>
                      {/* Tab switcher */}
                      <div className="checkin-tabs">
                        <button
                          className={`checkin-tab ${activeTab === 'search' ? 'active' : ''}`}
                          onClick={() => handleTabChange('search')}
                          type="button"
                        >
                          🔍 Search by Name
                        </button>
                        <button
                          className={`checkin-tab ${activeTab === 'id' ? 'active' : ''}`}
                          onClick={() => handleTabChange('id')}
                          type="button"
                        >
                          🆔 Member ID
                        </button>
                      </div>

                      {/* Tab: Search by Name */}
                      {activeTab === 'search' && (
                        <div className="checkin-tab-content">
                          <label htmlFor="checkin-name-search">Type your name to find your profile</label>
                          <div className="checkin-search-wrapper" ref={searchDropdownRef}>
                            <input
                              ref={searchInputRef}
                              id="checkin-name-search"
                              type="text"
                              className="checkin-id-input"
                              placeholder="e.g. John Doe"
                              value={searchQuery}
                              onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setSelectedMember(null);
                              }}
                              disabled={submitting}
                              autoComplete="off"
                              autoFocus
                            />

                            {searchLoading && (
                              <div className="checkin-search-status">Searching...</div>
                            )}

                            {!searchLoading && searchResults.length > 0 && (
                              <div className="checkin-search-dropdown">
                                {searchResults.map((member) => (
                                  <button
                                    key={member.member_id}
                                    type="button"
                                    className={`checkin-search-item ${selectedMember?.member_id === member.member_id ? 'selected' : ''}`}
                                    onClick={() => handleSelectMember(member)}
                                  >
                                    <span className="checkin-search-item-avatar">👤</span>
                                    <div className="checkin-search-item-info">
                                      <span className="checkin-search-item-name">{member.full_name}</span>
                                      <span className="checkin-search-item-id">{member.member_id}</span>
                                    </div>
                                    {selectedMember?.member_id === member.member_id && (
                                      <span className="checkin-search-item-check">✓</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}

                            {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
                              <div className="checkin-search-status checkin-search-empty">
                                No members found matching "{searchQuery}"
                              </div>
                            )}
                          </div>

                          {selectedMember && (
                            <div className="checkin-confirm">
                              <div className="checkin-confirm-avatar">👤</div>
                              <div className="checkin-confirm-text">
                                <p className="checkin-confirm-question">Is this you?</p>
                                <p className="checkin-confirm-name">{selectedMember.full_name}</p>
                                <p className="checkin-confirm-note">ID: {selectedMember.member_id}</p>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            className="checkin-submit-btn"
                            disabled={!canSubmit}
                            onClick={handleSubmit}
                          >
                            {submitting ? 'Checking in…' : selectedMember ? "✓ Yes, Check Me In" : '✓ Check In'}
                          </button>
                          <p className="checkin-form-hint">
                            Start typing your name and select yourself from the list.
                          </p>
                        </div>
                      )}

                      {/* Tab: Member ID */}
                      {activeTab === 'id' && (
                        <div className="checkin-tab-content">
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

                          <button
                            type="submit"
                            className="checkin-submit-btn"
                            disabled={!canSubmit}
                          >
                            {submitting ? 'Checking in…' : memberMatch?.full_name ? "✓ Yes, Check Me In" : '✓ Check In'}
                          </button>
                          <p className="checkin-form-hint">
                            The last 4 digits of your Member ID are printed on your membership card (e.g. 0001).
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {result?.success && (
                    <button
                      type="button"
                      className="checkin-another-btn"
                      onClick={handleReset}
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
