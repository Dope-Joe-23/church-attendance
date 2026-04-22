import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import authService from '../services/authService';
import { LoadingSpinner } from './index';
import '../styles/pages.css';

const InvitationCodeManager = () => {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [formMode, setFormMode] = useState('single'); // single or bulk
  const [singleForm, setSingleForm] = useState({
    email: '',
    expires_at: ''
  });
  const [bulkForm, setBulkForm] = useState({
    count: 5,
    expires_at: '',
    emails: ''
  });
  
  // Filters
  const [filterMode, setFilterMode] = useState('all'); // all, active, used

  // Load codes
  useEffect(() => {
    // Only load codes if user has authentication token
    if (authService.getToken()) {
      loadCodes();
    }
  }, [filterMode]);

  const loadCodes = async () => {
    setLoading(true);
    try {
      let endpoint = '/members/invitations/';
      
      if (filterMode === 'active') {
        endpoint = '/members/invitations/active/';
      } else if (filterMode === 'used') {
        endpoint = '/members/invitations/used/';
      }

      const response = await apiClient.get(endpoint);
      // Handle both array and paginated responses
      const codesList = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setCodes(codesList);
      setError('');
    } catch (err) {
      const errorMsg = err.response?.status === 401 
        ? 'Authentication required. Please log in again.' 
        : `Failed to load codes: ${err.response?.data?.error || err.message}`;
      setError(errorMsg);
      setCodes([]); // Set empty array on error
      console.error('Load codes error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateDate = (days = 7) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 16);
  };

  const handleGenerateSingle = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiClient.post('/members/invitations/', {
        email: singleForm.email || null,
        expires_at: singleForm.expires_at
      });

      setSuccess(`Code generated: ${response.data.code}`);
      setSingleForm({ email: '', expires_at: '' });
      loadCodes();
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(`Failed to generate code: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBulk = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const emails = bulkForm.emails
        .split('\n')
        .map(e => e.trim())
        .filter(e => e);

      const response = await apiClient.post('/members/invitations/generate_bulk/', {
        count: parseInt(bulkForm.count),
        expires_at: bulkForm.expires_at,
        emails: emails.length > 0 ? emails : undefined
      });

      setSuccess(`${response.data.count} codes generated successfully`);
      setBulkForm({ count: 5, expires_at: '', emails: '' });
      loadCodes();
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(`Failed to generate codes: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCode = async (codeId) => {
    if (!window.confirm('Delete this invitation code?')) return;

    try {
      await apiClient.delete(`/members/invitations/${codeId}/`);
      setSuccess('Code deleted');
      loadCodes();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(`Failed to delete code: ${err.message}`);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (code) => {
    if (code.used) {
      return <span className="badge badge-success">Used</span>;
    }
    if (!code.is_valid) {
      return <span className="badge badge-danger">Expired</span>;
    }
    return <span className="badge badge-info">Active</span>;
  };

  return (
    <div className="invitation-manager">
      <div className="manager-header">
        <h1>🎫 Invitation Code Manager</h1>
        <p>Generate and manage admin user invitation codes</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error}
          <button
            type="button"
            className="close"
            onClick={() => setError('')}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success" role="alert">
          {success}
          <button
            type="button"
            className="close"
            onClick={() => setSuccess('')}
          >
            ×
          </button>
        </div>
      )}

      <div className="manager-grid">
        {/* Generation Form */}
        <div className="card generation-card">
          <div className="card-header">
            <h2>Generate Invitation Codes</h2>
          </div>
          <div className="card-body">
            {/* Mode Toggle */}
            <div className="mode-toggle">
              <button
                className={`toggle-btn ${formMode === 'single' ? 'active' : ''}`}
                onClick={() => setFormMode('single')}
              >
                Single Code
              </button>
              <button
                className={`toggle-btn ${formMode === 'bulk' ? 'active' : ''}`}
                onClick={() => setFormMode('bulk')}
              >
                Bulk Codes
              </button>
            </div>

            {/* Single Code Form */}
            {formMode === 'single' && (
              <form onSubmit={handleGenerateSingle} className="form-section">
                <div className="form-group">
                  <label htmlFor="email">Email Address (Optional)</label>
                  <input
                    id="email"
                    type="email"
                    value={singleForm.email}
                    onChange={(e) => setSingleForm({ ...singleForm, email: e.target.value })}
                    placeholder="restrict@example.com (optional)"
                    className="form-control"
                  />
                  <small className="form-text text-muted">
                    If provided, code can only be used with this email
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="expires_at">Expires At *</label>
                  <input
                    id="expires_at"
                    type="datetime-local"
                    value={singleForm.expires_at}
                    onChange={(e) => setSingleForm({ ...singleForm, expires_at: e.target.value })}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <button type="button" className="quick-btn" onClick={() => setSingleForm({ ...singleForm, expires_at: generateDate(7) })}>
                    7 days
                  </button>
                  <button type="button" className="quick-btn" onClick={() => setSingleForm({ ...singleForm, expires_at: generateDate(14) })}>
                    14 days
                  </button>
                  <button type="button" className="quick-btn" onClick={() => setSingleForm({ ...singleForm, expires_at: generateDate(30) })}>
                    30 days
                  </button>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading || !singleForm.expires_at}>
                  {loading ? 'Generating...' : 'Generate Code'}
                </button>
              </form>
            )}

            {/* Bulk Code Form */}
            {formMode === 'bulk' && (
              <form onSubmit={handleGenerateBulk} className="form-section">
                <div className="form-group">
                  <label htmlFor="count">Number of Codes *</label>
                  <input
                    id="count"
                    type="number"
                    min="1"
                    max="100"
                    value={bulkForm.count}
                    onChange={(e) => setBulkForm({ ...bulkForm, count: parseInt(e.target.value) })}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="emails">Email Addresses (Optional)</label>
                  <textarea
                    id="emails"
                    value={bulkForm.emails}
                    onChange={(e) => setBulkForm({ ...bulkForm, emails: e.target.value })}
                    placeholder="one@example.com&#10;two@example.com&#10;three@example.com"
                    className="form-control"
                    rows="5"
                  />
                  <small className="form-text text-muted">
                    One email per line. Leave empty for unrestricted codes. Max {bulkForm.count} addresses.
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="bulk_expires_at">Expires At *</label>
                  <input
                    id="bulk_expires_at"
                    type="datetime-local"
                    value={bulkForm.expires_at}
                    onChange={(e) => setBulkForm({ ...bulkForm, expires_at: e.target.value })}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <button type="button" className="quick-btn" onClick={() => setBulkForm({ ...bulkForm, expires_at: generateDate(7) })}>
                    7 days
                  </button>
                  <button type="button" className="quick-btn" onClick={() => setBulkForm({ ...bulkForm, expires_at: generateDate(14) })}>
                    14 days
                  </button>
                  <button type="button" className="quick-btn" onClick={() => setBulkForm({ ...bulkForm, expires_at: generateDate(30) })}>
                    30 days
                  </button>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading || !bulkForm.expires_at}>
                  {loading ? 'Generating...' : `Generate ${bulkForm.count} Codes`}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Codes Display */}
        <div className="card codes-card">
          <div className="card-header">
            <h2>Invitation Codes</h2>
            <div className="filter-buttons">
              <button
                className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                All ({codes.length})
              </button>
              <button
                className={`filter-btn ${filterMode === 'active' ? 'active' : ''}`}
                onClick={() => setFilterMode('active')}
              >
                Active
              </button>
              <button
                className={`filter-btn ${filterMode === 'used' ? 'active' : ''}`}
                onClick={() => setFilterMode('used')}
              >
                Used
              </button>
            </div>
          </div>
          <div className="card-body">
            {loading && filterMode === 'all' && (
              <div style={{ padding: '40px 0' }}>
                <LoadingSpinner message="Loading invitation codes..." />
              </div>
            )}

            {error && (
              <div className="error-alert" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fee', color: '#c33', borderRadius: '6px', border: '1px solid #fcc' }}>
                <strong>Error:</strong> {error}
              </div>
            )}

            {!loading && (!Array.isArray(codes) || codes.length === 0) ? (
              <div className="empty-state">
                <p>No invitation codes found</p>
                <small>Generate one to get started</small>
              </div>
            ) : (
              <div className="codes-table">
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Expires</th>
                      <th>Created By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(codes) && codes.map((code) => (
                      <tr key={code.id} className={code.used ? 'used' : ''}>
                        <td className="code-cell">
                          <code>{code.code}</code>
                          <button
                            type="button"
                            className="copy-btn"
                            onClick={() => copyToClipboard(code.code)}
                            title="Copy code"
                          >
                            📋
                          </button>
                        </td>
                        <td>{code.email || '-'}</td>
                        <td>{getStatusBadge(code)}</td>
                        <td>
                          <small>{formatDate(code.expires_at)}</small>
                        </td>
                        <td>{code.created_by_username}</td>
                        <td>
                          {!code.used && code.is_valid && (
                            <button
                              type="button"
                              className="btn-small btn-danger"
                              onClick={() => handleDeleteCode(code.id)}
                            >
                              Delete
                            </button>
                          )}
                          {code.used && (
                            <small className="text-muted">Used by {code.used_by_username}</small>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="card info-card">
        <div className="card-header">
          <h3>How It Works</h3>
        </div>
        <div className="card-body">
          <ol className="info-list">
            <li><strong>Generate codes:</strong> Create one or many invitation codes</li>
            <li><strong>Share codes:</strong> Send codes to authorized users (via email, WhatsApp, etc.)</li>
            <li><strong>Users register:</strong> Users enter code + details on registration page</li>
            <li><strong>Code used:</strong> Code marked as used, user gets account access</li>
            <li><strong>Track usage:</strong> Monitor which codes were used and by whom</li>
          </ol>
          
          <h4>Tips</h4>
          <ul className="tips-list">
            <li>💡 Set expiration dates (7-30 days typical)</li>
            <li>💡 Restrict codes to emails for extra security</li>
            <li>💡 Bulk generate for mass onboarding</li>
            <li>💡 Codes automatically expire - no manual cleanup needed</li>
            <li>💡 View "Used" tab to audit who registered</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InvitationCodeManager;
