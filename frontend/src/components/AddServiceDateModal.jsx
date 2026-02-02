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
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !service) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate) {
      return;
    }
    
    setIsLoading(true);
    try {
      await onSubmit(service.id, selectedDate);
      setSelectedDate('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedDate('');
    onClose();
  };

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
            <div className="form-group">
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
