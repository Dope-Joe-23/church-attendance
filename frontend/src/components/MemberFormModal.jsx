import React from 'react';
import '../styles/components.css';

const DEPARTMENT_CHOICES = [
  { value: 'worship', label: 'Worship' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'youth', label: 'Youth' },
  { value: 'administration', label: 'Administration' },
];

const GROUP_CHOICES = [
  { value: 'group_a', label: 'Group A' },
  { value: 'group_b', label: 'Group B' },
  { value: 'group_c', label: 'Group C' },
  { value: 'group_d', label: 'Group D' },
];

const MemberFormModal = ({
  isOpen,
  isEditing,
  formData,
  onFormChange,
  onSubmit,
  onClose,
  error,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Member' : 'Add New Member'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form className="member-form-modal" onSubmit={onSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="modal-body form-body">
            <div className="form-group full-width">
              <label>Full Name *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) =>
                  onFormChange({ ...formData, full_name: e.target.value })
                }
                required
                className="input-field"
                placeholder="Enter full name"
              />
            </div>

            <div className="form-group half-width">
              <label>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  onFormChange({ ...formData, phone: e.target.value })
                }
                className="input-field"
                placeholder="Enter phone number"
              />
            </div>

            <div className="form-group half-width">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  onFormChange({ ...formData, email: e.target.value })
                }
                className="input-field"
                placeholder="Enter email address"
              />
            </div>

            <div className="form-group half-width">
              <label>Department</label>
              <select
                value={formData.department}
                onChange={(e) =>
                  onFormChange({ ...formData, department: e.target.value })
                }
                className="input-field"
              >
                <option value="">Select Department</option>
                {DEPARTMENT_CHOICES.map((dept) => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group half-width">
              <label>Group</label>
              <select
                value={formData.group}
                onChange={(e) =>
                  onFormChange({ ...formData, group: e.target.value })
                }
                className="input-field"
              >
                <option value="">Select Group</option>
                {GROUP_CHOICES.map((grp) => (
                  <option key={grp.value} value={grp.value}>
                    {grp.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_visitor}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      is_visitor: e.target.checked,
                    })
                  }
                  className="checkbox-field"
                />
                Is Visitor
              </label>
            </div>

            <div className="form-group full-width">
              <label>Location</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) =>
                  onFormChange({ ...formData, location: e.target.value })
                }
                className="input-field"
                placeholder="Enter location"
              />
            </div>

            <div className="form-group half-width">
              <label>
                <input
                  type="checkbox"
                  checked={formData.baptised || false}
                  onChange={(e) =>
                    onFormChange({
                      ...formData,
                      baptised: e.target.checked,
                      confirmed: e.target.checked ? formData.confirmed : false,
                    })
                  }
                  className="checkbox-field"
                />
                Baptised
              </label>
            </div>

            {formData.baptised && (
              <div className="form-group half-width">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.confirmed || false}
                    onChange={(e) =>
                      onFormChange({
                        ...formData,
                        confirmed: e.target.checked,
                      })
                    }
                    className="checkbox-field"
                  />
                  Confirmed
                </label>
              </div>
            )}
          </div>

          <div className="modal-footer form-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-success">
              {isEditing ? 'Update' : 'Create'} Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberFormModal;
