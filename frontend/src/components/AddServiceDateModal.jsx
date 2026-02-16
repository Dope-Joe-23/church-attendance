import React, { useState } from 'react';
import '../styles/components.css';

const AddServiceDateModal = ({
  isOpen,
  service,
  onSubmit,
  onClose,
  error,
}) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStartTime, setSelectedStartTime] = useState('');
  const [selectedEndTime, setSelectedEndTime] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  if (!isOpen || !service) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate) {
      return;
    }
    
    setIsLoading(true);
    try {
      await onSubmit(service.id, selectedDate, selectedLocation, selectedStartTime, selectedEndTime);
      setSelectedDate('');
      setSelectedStartTime('');
      setSelectedEndTime('');
      setSelectedLocation('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedDate('');
    setSelectedStartTime('');
    setSelectedEndTime('');
    setSelectedLocation('');
    onClose();
  };

  // Set defaults when modal opens (if not already set)
  const handleOpenModal = () => {
    if (!selectedDate) {
      setSelectedDate(getTodayDate());
      setSelectedStartTime(service.start_time || '');
      setSelectedEndTime(service.end_time || '');
    }
  };

  // Call handleOpenModal effect on mount
  React.useEffect(() => {
    if (isOpen && !selectedDate) {
      setSelectedDate(getTodayDate());
      setSelectedStartTime(service.start_time || '');
      setSelectedEndTime(service.end_time || '');
    }
  }, [isOpen, service]);

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Date to "{service.name}"</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="modal-body form-body">
            <div className="form-group full-width">
              <label>Service Date *</label>
              <p className="form-hint">
                Pattern: {service.recurrence_pattern?.charAt(0).toUpperCase() + service.recurrence_pattern?.slice(1)}
              </p>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                className="input-field"
                autoFocus
              />
            </div>

            <div className="form-group half-width">
              <label>Start Time (optional)</label>
              <p className="form-hint">Defaults to parent</p>
              <input
                type="time"
                value={selectedStartTime}
                onChange={(e) => setSelectedStartTime(e.target.value)}
                className="input-field"
                title="Start Time (optional - defaults to parent service time)"
              />
            </div>

            <div className="form-group half-width">
              <label>End Time (optional)</label>
              <p className="form-hint">Defaults to parent</p>
              <input
                type="time"
                value={selectedEndTime}
                onChange={(e) => setSelectedEndTime(e.target.value)}
                className="input-field"
                title="End Time (optional - defaults to parent service time)"
              />
            </div>

            <div className="form-group full-width">
              <label>Location (optional)</label>
              <input
                type="text"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                placeholder="Leave blank to use parent service location"
                className="input-field"
              />
            </div>
          </div>

          <div className="modal-footer form-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-success"
              disabled={isLoading || !selectedDate}
            >
              {isLoading ? 'Creating...' : 'Create Instance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddServiceDateModal;
