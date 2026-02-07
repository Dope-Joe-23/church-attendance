import React, { useState } from 'react';
import '../styles/components.css';

const SessionsModal = ({
  isOpen,
  service,
  sessions,
  onSelectSession,
  onClose,
  isLoading,
  onAddDate,
  addDateError,
  onSessionAdded,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  if (!isOpen || !service) return null;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleAddDateSubmit = async (e) => {
    e.preventDefault();
    if (!newDate || !newStartTime || !newEndTime) return;

    setIsSubmitting(true);
    setLocalError(null);
    try {
      await onAddDate(service.id, newDate, newLocation, newStartTime, newEndTime);
      setNewDate('');
      setNewLocation('');
      setNewStartTime('');
      setNewEndTime('');
      setShowAddForm(false);
      // Notify parent to refresh sessions
      if (onSessionAdded) {
        onSessionAdded(service.id);
      }
    } catch (err) {
      setLocalError(addDateError || 'Failed to create session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
    setNewDate('');
    setNewLocation('');
    setNewStartTime('');
    setNewEndTime('');
    setLocalError(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content sessions-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{service.name}</h2>
            <p className="modal-subtitle">Select or add a session</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body sessions-modal-body">
          {isLoading ? (
            <div className="sessions-loading">
              <span>Loading sessions...</span>
            </div>
          ) : sessions && sessions.length > 0 ? (
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Location</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="session-row">
                    <td className="session-date-cell">
                      <strong>{formatDate(session.date)}</strong>
                    </td>
                    <td className="session-time-cell">
                      {formatTime(session.start_time)} — {formatTime(session.end_time)}
                    </td>
                    <td className="session-location-cell">
                      {session.location || '—'}
                    </td>
                    <td className="session-action-cell">
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => onSelectSession(session)}
                      >
                        Take
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-sessions">
              <p>No sessions scheduled yet.</p>
            </div>
          )}
        </div>

        {onAddDate && (
          <div className="sessions-footer">
            {!showAddForm ? (
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={toggleAddForm}
              >
                + Add Session Date
              </button>
            ) : (
              <form onSubmit={handleAddDateSubmit} className="add-session-form">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="session-date-input"
                  autoFocus
                />
                <input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="session-time-input"
                  title="Start Time"
                />
                <input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="session-time-input"
                  title="End Time"
                />
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Location (optional)"
                  disabled={isSubmitting}
                  className="session-location-input"
                />
                {(localError || addDateError) && (
                  <div className="form-error">
                    {localError || addDateError}
                  </div>
                )}
                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-sm btn-success"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={toggleAddForm}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionsModal;
