import React, { useState } from 'react';
import apiClient from '../services/apiClient';
import wisLogo from '../assets/wis_logo.jpg';
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
  { value: 'newtown_estate', label: 'Newtown/Estate' },
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

const SEX_CHOICES = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const MARITAL_STATUS_CHOICES = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
];

const initialForm = {
  full_name: '',
  phone: '',
  email: '',
  date_of_birth: '',
  sex: '',
  place_of_residence: '',
  profession: '',
  department: '',
  class_name: '',
  committee: '',
  marital_status: '',
  baptised: false,
  confirmed: false,
};

const PublicRegister = () => {
  const [formData, setFormData] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Download styled membership card
  const [cardDataUri, setCardDataUri] = useState(null);
  const [loadingCard, setLoadingCard] = useState(false);

  // Fetch membership card after successful registration (hook at top level)
  const memberPk = result?.success ? result.data.member.id : null;
  React.useEffect(() => {
    if (memberPk && !cardDataUri && !loadingCard) {
      setLoadingCard(true);
      apiClient.get(`/members/${memberPk}/membership_card_data/`)
        .then((resp) => setCardDataUri(resp.data.card_data_uri))
        .catch((err) => console.error('Failed to load membership card:', err))
        .finally(() => setLoadingCard(false));
    }
  }, [memberPk]);

  // --- Field-level validation ---
  const validatePhone = (value) => {
    if (!value || !value.trim()) return 'Phone number is required';
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 10) {
      return `Must be exactly 10 digits (${digits.length} entered)`;
    }
    return '';
  };

  const validateEmail = (value) => {
    if (!value || !value.trim()) return ''; // optional
    if (!value.toLowerCase().endsWith('@gmail.com')) {
      return 'Only Gmail addresses are accepted';
    }
    return '';
  };

  const validateName = (value) => {
    if (!value || !value.trim()) return 'Full name is required';
    return '';
  };

  // Extract username part from email (strip @gmail.com)
  const getEmailUsername = (email) => {
    if (!email) return '';
    return email.replace(/@gmail\.com$/i, '');
  };

  // Build full email from username
  const buildEmail = (username) => {
    if (!username || !username.trim()) return '';
    return username.trim().toLowerCase() + '@gmail.com';
  };

  const handleChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: val }));
    // Clear error on change
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, phone: val }));
    setFieldErrors((prev) => ({ ...prev, phone: validatePhone(val) }));
  };

  const handleEmailChange = (e) => {
    const username = e.target.value.replace(/@gmail\.com$/i, '').replace(/@/g, '');
    const fullEmail = buildEmail(username);
    setFormData((prev) => ({ ...prev, email: fullEmail }));
    setFieldErrors((prev) => ({ ...prev, email: validateEmail(fullEmail) }));
  };



  const downloadCard = () => {
    const dataUri = cardDataUri;
    if (!dataUri) return;
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `membership_card_${result.data.member.member_id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printCard = () => {
    if (!cardDataUri) return;
    const printWindow = window.open('', '_blank', 'width=650,height=950');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Membership Card - ${result.data.member.member_id}</title>
        <style>
          body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; background: #fff; }
          img { max-width: 100%; height: auto; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <img src="${cardDataUri}" onload="setTimeout(()=>window.print(), 400)" />
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all required fields
    const errors = {
      full_name: validateName(formData.full_name),
      phone: validatePhone(formData.phone),
      email: validateEmail(formData.email),
    };
    setFieldErrors(errors);

    if (Object.values(errors).some((err) => err)) return;

    setSubmitting(true);
    setResult(null);

    try {
      const payload = { ...formData };
      // Remove empty optional fields
      if (!payload.email) delete payload.email;
      if (!payload.date_of_birth) delete payload.date_of_birth;
      if (!payload.sex) delete payload.sex;
      if (!payload.place_of_residence) delete payload.place_of_residence;
      if (!payload.profession) delete payload.profession;
      if (!payload.department) delete payload.department;
      if (!payload.class_name) delete payload.class_name;
      if (!payload.committee) delete payload.committee;
      if (!payload.marital_status) delete payload.marital_status;

      const response = await apiClient.post('/public/register/', payload);
      setResult({
        success: true,
        data: response.data,
      });
      setFormData(initialForm);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Registration failed. Please try again.';
      setResult({ success: false, message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (result?.success) {
    const memberName = result.data.member.full_name;
    const memberId = result.data.member.member_id;

    return (
      <div className="public-register-page">
        <div className="register-card">
          <div className="register-card-header success-header">
            <span className="church-badge"><img src={wisLogo} alt="WIS" style={{height: '14px', verticalAlign: 'middle', marginRight: '4px', borderRadius: '2px'}} /> WIS Sunyani</span>
            <div className="success-checkmark">✅</div>
            <h1>Welcome, {memberName}!</h1>
            <p>You have been successfully registered</p>
          </div>
          <div className="register-card-body register-success">
            <div className="member-id-display">
              <span className="label">Your Member ID</span>
              <span className="member-id-value">{memberId}</span>
            </div>

            <p className="success-note">
              📌 Save your Member ID for check-in at church services.
            </p>

            <div className="success-qr-actions">
              <button
                type="button"
                className="btn btn-primary download-qr-btn"
                onClick={downloadCard}
                disabled={!cardDataUri}
              >
                ⬇️ Download Card
              </button>
              <button
                type="button"
                className="btn btn-secondary download-qr-btn"
                onClick={printCard}
                disabled={!cardDataUri}
              >
                🖨️ Print Card
              </button>
            </div>

            <button
              className="btn btn-primary register-another-btn"
              onClick={() => { setResult(null); setCardDataUri(null); }}
            >
              Register Another Member
            </button>
          </div>
          <div className="register-card-footer">
            <p>Wesleyan International Society — Sunyani</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-register-page">
      <div className="register-card">
        <div className="register-card-header">
              <span className="church-badge"><img src={wisLogo} alt="WIS" style={{height: '14px', verticalAlign: 'middle', marginRight: '4px', borderRadius: '2px'}} /> WIS Sunyani</span>
              <h1>Member Registration</h1>
          <p>Fill in your details to join the church database</p>
        </div>

        <div className="register-card-body">
          <form onSubmit={handleSubmit} className="register-form">
            {result && !result.success && (
              <div className="form-error">{result.message}</div>
            )}

            {/* Row 1: Full Name | Phone */}
            <div className="register-row">
              <div className="register-field">
                <label htmlFor="reg-full-name">Full Name *</label>
                <input
                  id="reg-full-name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleChange('full_name')}
                  className={`input-field ${fieldErrors.full_name ? 'input-error' : ''}`}
                  placeholder="Enter your full name"
                  autoFocus
                />
                {fieldErrors.full_name && (
                  <span className="field-error">{fieldErrors.full_name}</span>
                )}
              </div>
              <div className="register-field">
                <label htmlFor="reg-phone">Phone Number *</label>
                <input
                  id="reg-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className={`input-field ${fieldErrors.phone ? 'input-error' : ''}`}
                  placeholder="10-digit phone number"
                  maxLength={12}
                />
                {fieldErrors.phone && (
                  <span className="field-error">{fieldErrors.phone}</span>
                )}
              </div>
            </div>

            {/* Row 2: Email */}
            <div className="register-field">
              <label htmlFor="reg-email">Email Address (Gmail only)</label>
              <div className="email-input-wrapper">
                <input
                  id="reg-email"
                  type="text"
                  value={getEmailUsername(formData.email)}
                  onChange={handleEmailChange}
                  className={`input-field email-input ${fieldErrors.email ? 'input-error' : ''}`}
                  placeholder="yourname"
                />
                <span className="email-suffix">@gmail.com</span>
              </div>
              {fieldErrors.email && (
                <span className="field-error">{fieldErrors.email}</span>
              )}
            </div>

            {/* Row 3: DOB | Sex */}
            <div className="register-row">
              <div className="register-field">
                <label htmlFor="reg-dob">Date of Birth</label>
                <input
                  id="reg-dob"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleChange('date_of_birth')}
                  className="input-field"
                />
              </div>
              <div className="register-field">
                <label htmlFor="reg-sex">Sex</label>
                <select
                  id="reg-sex"
                  value={formData.sex}
                  onChange={handleChange('sex')}
                  className="input-field"
                >
                  <option value="">Select Sex</option>
                  {SEX_CHOICES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 4: Residence | Profession */}
            <div className="register-row">
              <div className="register-field">
                <label htmlFor="reg-residence">Place of Residence</label>
                <input
                  id="reg-residence"
                  type="text"
                  value={formData.place_of_residence}
                  onChange={handleChange('place_of_residence')}
                  className="input-field"
                  placeholder="Where do you live?"
                />
              </div>
              <div className="register-field">
                <label htmlFor="reg-profession">Profession</label>
                <input
                  id="reg-profession"
                  type="text"
                  value={formData.profession}
                  onChange={handleChange('profession')}
                  className="input-field"
                  placeholder="What do you do?"
                />
              </div>
            </div>

            {/* Row 5: Department | Class */}
            <div className="register-row">
              <div className="register-field">
                <label htmlFor="reg-dept">Department</label>
                <select
                  id="reg-dept"
                  value={formData.department}
                  onChange={handleChange('department')}
                  className="input-field"
                >
                  <option value="">Select Department</option>
                  {DEPARTMENT_CHOICES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div className="register-field">
                <label htmlFor="reg-class">Class</label>
                <select
                  id="reg-class"
                  value={formData.class_name}
                  onChange={handleChange('class_name')}
                  className="input-field"
                >
                  <option value="">Select Class</option>
                  {CLASS_CHOICES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 6: Committee | Marital Status */}
            <div className="register-row">
              <div className="register-field">
                <label htmlFor="reg-committee">Committee</label>
                <select
                  id="reg-committee"
                  value={formData.committee}
                  onChange={handleChange('committee')}
                  className="input-field"
                >
                  <option value="">Select Committee</option>
                  {COMMITTEE_CHOICES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="register-field">
                <label htmlFor="reg-marital">Marital Status</label>
                <select
                  id="reg-marital"
                  value={formData.marital_status}
                  onChange={handleChange('marital_status')}
                  className="input-field"
                >
                  <option value="">Select Status</option>
                  {MARITAL_STATUS_CHOICES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 7: Checkboxes side by side */}
            <div className="register-row register-row-checkboxes">
              <div className="register-field register-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.baptised}
                    onChange={handleChange('baptised')}
                  />
                  Baptised
                </label>
              </div>
              {formData.baptised && (
                <div className="register-field register-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.confirmed}
                      onChange={handleChange('confirmed')}
                    />
                    Confirmed
                  </label>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary register-submit-btn"
              disabled={submitting}
            >
              {submitting ? 'Registering...' : 'Register as Member'}
            </button>
          </form>
        </div>

        <div className="register-card-footer">
          <p>Wesleyan International Society — Sunyani</p>
        </div>
      </div>
    </div>
  );
};

export default PublicRegister;
