import React from 'react';
import '../styles/components.css';

const DEPARTMENT_CHOICES = [
  { value: 'technical', label: 'Technical' },
  { value: 'media', label: 'Media' },
  { value: 'echoes_of_grace', label: 'Echoes of Grace' },
  { value: 'celestial_harmony_choir', label: 'Celestial Harmony Choir' },
  { value: 'heavenly_vibes', label: 'Heavenly Vibes' },
  { value: 'prayer_evangelism', label: 'Prayer and Evangelism' },
  { value: 'visitor_care', label: 'Visitor Care' },
  { value: 'protocol_ushering', label: 'Protocol & Ushering' },
];

const CLASS_CHOICES = [
  { value: 'airport', label: 'Airport' },
  { value: 'abesim', label: 'Abesim' },
  { value: 'old_abesim', label: 'Old Abesim' },
  { value: 'asufufu_adomako', label: 'Asufufu / Adomako' },
  { value: 'baakoniaba', label: 'Baakoniaba' },
  { value: 'berlin_top_class_1', label: 'Berlin Top class 1' },
  { value: 'berlin_top_class_2', label: 'Berlin Top class 2' },
  { value: 'penkwase_class_1', label: 'Penkwase class 1' },
  { value: 'penkwase_class_2', label: 'Penkwase class 2' },
  { value: 'mayfair', label: 'Mayfair' },
  { value: 'odumase', label: 'Odumase' },
  { value: 'new_dormaa_kotokrom', label: 'New Dormaa / Kotokrom' },
  { value: 'dumasua', label: 'Dumasua' },
  { value: 'fiapre_class_1', label: 'Fiapre Class 1' },
  { value: 'fiapre_class_2', label: 'Fiapre Class 2' },
  { value: 'magazine', label: 'Magazine' },
  { value: 'town_centre', label: 'Town Centre' },
  { value: 'newton_estate', label: 'Newton/Estate' },
  { value: 'distance', label: 'Distance' },
];

const COMMITTEE_CHOICES = [
  { value: 'finance', label: 'Finance' },
  { value: 'audit', label: 'Audit' },
  { value: 'project', label: 'Project' },
  { value: 'life_builders', label: 'Life Builders' },
  { value: 'health', label: 'Health' },
  { value: 'welfare', label: 'Welfare' },
  { value: 'harvest', label: 'Harvest' },
];

const MARITAL_STATUS_CHOICES = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
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

  const contactMethodMissing = !formData.is_visitor && !formData.email?.trim() && !formData.phone?.trim();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Member' : 'Add New Member'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form className="member-form-modal" onSubmit={onSubmit}>
          {error && <div className="form-error">{error}</div>}
          {contactMethodMissing && (
            <div className="form-warning">
              ⚠️ Non-visitor members must have at least one contact method (email or phone)
            </div>
          )}

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
              <label>Date of Birth</label>
              <input
                type="date"
                value={formData.date_of_birth || ''}
                onChange={(e) =>
                  onFormChange({ ...formData, date_of_birth: e.target.value })
                }
                className="input-field"
              />
            </div>

            <div className="form-group half-width">
              <label>Contact</label>
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
              <label>Email Address</label>
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
              <label>Place of Residence</label>
              <input
                type="text"
                value={formData.place_of_residence || ''}
                onChange={(e) =>
                  onFormChange({ ...formData, place_of_residence: e.target.value })
                }
                className="input-field"
                placeholder="Enter place of residence"
              />
            </div>

            <div className="form-group half-width">
              <label>Profession</label>
              <input
                type="text"
                value={formData.profession || ''}
                onChange={(e) =>
                  onFormChange({ ...formData, profession: e.target.value })
                }
                className="input-field"
                placeholder="Enter profession"
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
              <label>Class</label>
              <select
                value={formData.class_name || ''}
                onChange={(e) =>
                  onFormChange({ ...formData, class_name: e.target.value })
                }
                className="input-field"
              >
                <option value="">Select Class</option>
                {CLASS_CHOICES.map((cls) => (
                  <option key={cls.value} value={cls.value}>
                    {cls.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group half-width">
              <label>Committee</label>
              <select
                value={formData.committee || ''}
                onChange={(e) =>
                  onFormChange({ ...formData, committee: e.target.value })
                }
                className="input-field"
              >
                <option value="">Select Committee</option>
                {COMMITTEE_CHOICES.map((com) => (
                  <option key={com.value} value={com.value}>
                    {com.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group half-width">
              <label>Marital Status</label>
              <select
                value={formData.marital_status || ''}
                onChange={(e) =>
                  onFormChange({ ...formData, marital_status: e.target.value })
                }
                className="input-field"
              >
                <option value="">Select Marital Status</option>
                {MARITAL_STATUS_CHOICES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
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
