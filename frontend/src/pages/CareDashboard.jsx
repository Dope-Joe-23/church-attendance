import React, { useState, useEffect } from 'react';
import store from '../context/store';
import apiClient from '../services/apiClient';
import '../styles/care-dashboard.css';

const CareDashboard = () => {
  const [alerts, setAlerts] = useState({
    early_warning: [],
    at_risk: [],
    critical: []
  });
  const [contactLogs, setContactLogs] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberStats, setMemberStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('all');
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    contact_method: 'email',
    message_sent: '',
    contacted_by: '',
    response_received: '',
    follow_up_needed: false,
    follow_up_date: ''
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/members/alerts/unresolved/');
      
      // Group alerts by level
      const grouped = {
        early_warning: [],
        at_risk: [],
        critical: []
      };
      
      response.data.forEach(alert => {
        grouped[alert.alert_level].push(alert);
      });
      
      setAlerts(grouped);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberDetails = async (memberId) => {
    try {
      const response = await apiClient.get(`/members/${memberId}/`);
      setSelectedMember(response.data);
      
      // Fetch contact logs for this member
      const contactResponse = await apiClient.get(`/members/contact-logs/by_member/?member_id=${memberId}`);
      setContactLogs(contactResponse.data);
      
      setMemberStats({
        consecutive_absences: response.data.consecutive_absences,
        attendance_percentage: response.data.attendance_percentage || '0',
        engagement_score: response.data.engagement_score,
        last_attendance_date: response.data.last_attendance_date,
        last_contact_date: response.data.last_contact_date,
        attendance_status: response.data.attendance_status
      });
    } catch (error) {
      console.error('Error fetching member details:', error);
    }
  };

  const handleContactFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLogContact = async () => {
    if (!selectedMember) return;
    
    try {
      const payload = {
        member: selectedMember.id,
        ...contactForm
      };
      
      await apiClient.post('/members/contact-logs/', payload);
      
      // Clear form and refresh contact logs
      setContactForm({
        contact_method: 'email',
        message_sent: '',
        contacted_by: '',
        response_received: '',
        follow_up_needed: false,
        follow_up_date: ''
      });
      setShowContactForm(false);
      
      // Refresh member details
      fetchMemberDetails(selectedMember.id);
      
      store.showNotification('Contact logged successfully', 'success');
    } catch (error) {
      console.error('Error logging contact:', error);
      store.showNotification('Error logging contact', 'error');
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await apiClient.post(`/members/alerts/${alertId}/resolve/`, {
        resolution_notes: 'Alert resolved through pastoral care'
      });
      
      // Refresh alerts
      fetchAlerts();
      store.showNotification('Alert marked as resolved', 'success');
    } catch (error) {
      console.error('Error resolving alert:', error);
      store.showNotification('Error resolving alert', 'error');
    }
  };

  const getAlertStats = () => {
    return {
      critical: alerts.critical.length,
      at_risk: alerts.at_risk.length,
      early_warning: alerts.early_warning.length,
      total: alerts.critical.length + alerts.at_risk.length + alerts.early_warning.length
    };
  };

  const getAllAlerts = () => {
    if (filterLevel === 'all') {
      return [...alerts.critical, ...alerts.at_risk, ...alerts.early_warning];
    }
    return alerts[filterLevel] || [];
  };

  const getAlertColor = (level) => {
    switch(level) {
      case 'critical': return '#d32f2f';
      case 'at_risk': return '#f57c00';
      case 'early_warning': return '#fbc02d';
      default: return '#999';
    }
  };

  const getAlertBadgeClass = (level) => {
    return `alert-badge alert-${level}`;
  };

  if (loading) {
    return <div className="care-dashboard"><div className="loading">Loading...</div></div>;
  }

  const stats = getAlertStats();
  const displayAlerts = getAllAlerts();

  return (
    <div className="care-dashboard">
      <div className="dashboard-header">
        <h1>Member Care & Engagement Dashboard</h1>
        <p>Track absent members and manage pastoral outreach</p>
      </div>

      {/* Alert Statistics */}
      <div className="alert-statistics">
        <div className="stat-card critical">
          <div className="stat-number">{stats.critical}</div>
          <div className="stat-label">🔴 Critical</div>
          <div className="stat-desc">8+ weeks absent</div>
        </div>
        <div className="stat-card at-risk">
          <div className="stat-number">{stats.at_risk}</div>
          <div className="stat-label">🟠 At Risk</div>
          <div className="stat-desc">4+ absences</div>
        </div>
        <div className="stat-card early-warning">
          <div className="stat-number">{stats.early_warning}</div>
          <div className="stat-label">🟡 Early Warning</div>
          <div className="stat-desc">2 absences</div>
        </div>
        <div className="stat-card total">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">📊 Total Alerts</div>
          <div className="stat-desc">Needing attention</div>
        </div>
      </div>

      {/* Filter and Content */}
      <div className="dashboard-content">
        {/* Left Column - Member List */}
        <div className="members-list-section">
          <div className="section-header">
            <h2>Members Needing Attention</h2>
            <div className="filter-buttons">
              <button
                className={filterLevel === 'all' ? 'active' : ''}
                onClick={() => setFilterLevel('all')}
              >
                All ({stats.total})
              </button>
              <button
                className={filterLevel === 'critical' ? 'active' : ''}
                onClick={() => setFilterLevel('critical')}
              >
                Critical ({stats.critical})
              </button>
              <button
                className={filterLevel === 'at_risk' ? 'active' : ''}
                onClick={() => setFilterLevel('at_risk')}
              >
                At Risk ({stats.at_risk})
              </button>
              <button
                className={filterLevel === 'early_warning' ? 'active' : ''}
                onClick={() => setFilterLevel('early_warning')}
              >
                Warning ({stats.early_warning})
              </button>
            </div>
          </div>

          <div className="members-list">
            {displayAlerts.length === 0 ? (
              <div className="empty-state">
                <p>✨ No alerts in this category!</p>
              </div>
            ) : (
              displayAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`member-card ${selectedMember?.id === alert.member ? 'selected' : ''}`}
                  onClick={() => fetchMemberDetails(alert.member)}
                  style={{ borderLeft: `4px solid ${getAlertColor(alert.alert_level)}` }}
                >
                  <div className="member-card-header">
                    <h3>{alert.member_name}</h3>
                    <span className={getAlertBadgeClass(alert.alert_level)}>
                      {alert.alert_level.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="member-card-reason">
                    <p>{alert.reason}</p>
                  </div>
                  <div className="member-card-date">
                    <small>Alert created: {new Date(alert.created_at).toLocaleDateString()}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column - Member Details */}
        <div className="member-details-section">
          {selectedMember ? (
            <>
              <div className="section-header">
                <h2>Member Details</h2>
              </div>

              <div className="member-profile">
                <div className="profile-header">
                  <h3>{selectedMember.full_name}</h3>
                  <p className="member-id">ID: {selectedMember.member_id}</p>
                </div>

                {memberStats && (
                  <div className="member-stats">
                    <div className="stat">
                      <label>Engagement Score</label>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${memberStats.engagement_score}%` }}
                        ></div>
                      </div>
                      <span>{memberStats.engagement_score}/100</span>
                    </div>

                    <div className="stat">
                      <label>Consecutive Absences</label>
                      <span className="value">{memberStats.consecutive_absences}</span>
                    </div>

                    <div className="stat">
                      <label>Status</label>
                      <span className={`status-badge ${memberStats.attendance_status}`}>
                        {memberStats.attendance_status}
                      </span>
                    </div>

                    <div className="stat">
                      <label>Last Attendance</label>
                      <span>{memberStats.last_attendance_date || 'No record'}</span>
                    </div>

                    <div className="stat">
                      <label>Last Contact</label>
                      <span>{memberStats.last_contact_date || 'Not contacted yet'}</span>
                    </div>
                  </div>
                )}

                <div className="contact-info">
                  <h4>Contact Information</h4>
                  <p>
                    <strong>Email:</strong> {selectedMember.email || 'Not provided'}
                  </p>
                  <p>
                    <strong>Phone:</strong> {selectedMember.phone || 'Not provided'}
                  </p>
                  <p>
                    <strong>Group:</strong> {selectedMember.group || 'Not assigned'}
                  </p>
                </div>

                {selectedMember.pastoral_notes && (
                  <div className="pastoral-notes">
                    <h4>Pastoral Notes</h4>
                    <p>{selectedMember.pastoral_notes}</p>
                  </div>
                )}

                {/* Contact History */}
                <div className="contact-history">
                  <h4>Recent Contact Attempts ({contactLogs.length})</h4>
                  {contactLogs.length === 0 ? (
                    <p className="empty-history">No contact attempts yet</p>
                  ) : (
                    <div className="history-list">
                      {contactLogs.map(log => (
                        <div key={log.id} className="history-item">
                          <div className="history-method">{log.contact_method.toUpperCase()}</div>
                          <div className="history-content">
                            <p className="history-message">{log.message_sent}</p>
                            {log.response_received && (
                              <p className="history-response">Response: {log.response_received}</p>
                            )}
                            <small>{new Date(log.contact_date).toLocaleDateString()}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contact Form */}
                {!showContactForm ? (
                  <button
                    className="btn btn-primary contact-btn"
                    onClick={() => setShowContactForm(true)}
                  >
                    📞 Log Contact
                  </button>
                ) : (
                  <div className="contact-form">
                    <h4>Log Member Contact</h4>

                    <div className="form-group">
                      <label>Contact Method</label>
                      <select
                        name="contact_method"
                        value={contactForm.contact_method}
                        onChange={handleContactFormChange}
                      >
                        <option value="email">Email</option>
                        <option value="sms">SMS Text</option>
                        <option value="phone">Phone Call</option>
                        <option value="visit">In-Person Visit</option>
                        <option value="small_group">Small Group Check-in</option>
                        <option value="social_media">Social Media</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Your Name (Optional)</label>
                      <input
                        type="text"
                        name="contacted_by"
                        placeholder="Your name"
                        value={contactForm.contacted_by}
                        onChange={handleContactFormChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Message Sent *</label>
                      <textarea
                        name="message_sent"
                        placeholder="What message did you send?"
                        value={contactForm.message_sent}
                        onChange={handleContactFormChange}
                        rows="3"
                      ></textarea>
                    </div>

                    <div className="form-group">
                      <label>Response Received (Optional)</label>
                      <textarea
                        name="response_received"
                        placeholder="What was their response?"
                        value={contactForm.response_received}
                        onChange={handleContactFormChange}
                        rows="2"
                      ></textarea>
                    </div>

                    <div className="form-group checkbox">
                      <input
                        type="checkbox"
                        id="follow_up"
                        name="follow_up_needed"
                        checked={contactForm.follow_up_needed}
                        onChange={handleContactFormChange}
                      />
                      <label htmlFor="follow_up">Follow-up needed?</label>
                    </div>

                    {contactForm.follow_up_needed && (
                      <div className="form-group">
                        <label>Follow-up Date</label>
                        <input
                          type="date"
                          name="follow_up_date"
                          value={contactForm.follow_up_date}
                          onChange={handleContactFormChange}
                        />
                      </div>
                    )}

                    <div className="form-actions">
                      <button
                        className="btn btn-success"
                        onClick={handleLogContact}
                      >
                        ✓ Save Contact Log
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setShowContactForm(false);
                          setContactForm({
                            contact_method: 'email',
                            message_sent: '',
                            contacted_by: '',
                            response_received: '',
                            follow_up_needed: false,
                            follow_up_date: ''
                          });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Select a member from the list to view details and log contact</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CareDashboard;
