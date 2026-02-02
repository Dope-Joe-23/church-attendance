import React from 'react';
import '../styles/components.css';

const ServiceFormModal = ({
  isOpen,
  isEditing,
  formData,
  onFormChange,
  onSubmit,
  onClose,
  error,
  onAddDate,
}) => {
  if (!isOpen) return null;

  // Check if this is a recurring parent service (editing mode only)
  const isRecurringParent = isEditing && formData.is_recurring && !formData.parent_service;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Service' : 'Add New Service'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form className="service-form-modal" onSubmit={onSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="modal-body form-body">
            <div className="form-group">
              <label>Service Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  onFormChange({ ...formData, name: e.target.value })
                }
                required
                className="input-field"
                placeholder="Enter service name"
              />
            </div>

            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  onFormChange({ ...formData, date: e.target.value })
                }
                required
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label>Start Time *</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) =>
                  onFormChange({ ...formData, start_time: e.target.value })
                }
                required
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label>End Time *</label>
              <input
                type="time"
                value={formData.end_time || ''}
                onChange={(e) =>
                  onFormChange({ ...formData, end_time: e.target.value })
                }
                required
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label>Is Recurring?</label>
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  checked={formData.is_recurring || false}
                  onChange={(e) =>
                    onFormChange({ ...formData, is_recurring: e.target.checked })
                  }
                  className="checkbox-input"
                  id="is_recurring"
                />
                <label htmlFor="is_recurring">This is a recurring service</label>
              </div>
            </div>

            {formData.is_recurring && (
              <div className="form-group">
                <label>Recurrence Pattern *</label>
                <select
                  value={formData.recurrence_pattern || ''}
                  onChange={(e) =>
                    onFormChange({ ...formData, recurrence_pattern: e.target.value })
                  }
                  required={formData.is_recurring}
                  className="input-field"
                >
                  <option value="">Select pattern</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) =>
                  onFormChange({ ...formData, location: e.target.value })
                }
                className="input-field"
                placeholder="Enter location"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  onFormChange({ ...formData, description: e.target.value })
                }
                rows="4"
                className="input-field"
                placeholder="Enter service description"
              />
            </div>
          </div>

          <div className="modal-footer form-footer">
            {isRecurringParent && onAddDate && (
              <button
                type="button"
                className="btn btn-info"
                onClick={() => onAddDate(formData)}
              >
                ➕ Add New Date
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-success">
              {isEditing ? 'Update' : 'Create'} Service
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceFormModal;

