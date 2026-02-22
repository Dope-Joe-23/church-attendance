import React, { useState } from 'react';
import apiClient from '../services/apiClient';
import store from '../context/store';
import '../styles/components.css';

const LogContactModal = ({ isOpen, member, onClose, onContactLogged }) => {
  const [contactForm, setContactForm] = useState({
    contact_method: 'email',
    message_sent: '',
    contacted_by: '',
    response_received: '',
    follow_up_needed: false,
    follow_up_date: ''
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !member) return null;

  const handleContactFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLogContact = async () => {
    if (!contactForm.message_sent.trim()) {
      store.showNotification('Please enter a message', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        member: member.id,
        ...contactForm
      };

      await apiClient.post('/members/contact-logs/', payload);

      // Reset form
      setContactForm({
        contact_method: 'email',
        message_sent: '',
        contacted_by: '',
        response_received: '',
        follow_up_needed: false,
        follow_up_date: ''
      });

      store.showNotification('Contact logged successfully', 'success');
      
      // Call callback to refresh data
      if (onContactLogged) {
        onContactLogged();
      }
      
      onClose();
    } catch (error) {
      console.error('Error logging contact:', error);
      store.showNotification('Error logging contact', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setContactForm({
      contact_method: 'email',
      message_sent: '',
      contacted_by: '',
      response_received: '',
      follow_up_needed: false,
      follow_up_date: ''
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content log-contact-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-section">
            <h2>Log Contact</h2>
            <p className="member-name-subtitle">{member.full_name}</p>
          </div>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body log-contact-body">
          <form onSubmit={(e) => { e.preventDefault(); handleLogContact(); }}>
            <div className="form-section">
              <div className="form-group">
                <label>Contact Method *</label>
                <select
                  name="contact_method"
                  value={contactForm.contact_method}
                  onChange={handleContactFormChange}
                  className="input-field"
                >
                  <option value="email">📧 Email</option>
                  <option value="sms">💬 SMS Text</option>
                  <option value="phone">☎️ Phone Call</option>
                  <option value="visit">🚪 In-Person Visit</option>
                  <option value="small_group">👥 Small Group Check-in</option>
                  <option value="social_media">📱 Social Media</option>
                </select>
              </div>

              <div className="form-group">
                <label>Your Name (Optional)</label>
                <input
                  type="text"
                  name="contacted_by"
                  placeholder="Who made this contact?"
                  value={contactForm.contacted_by}
                  onChange={handleContactFormChange}
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label>Message Sent *</label>
                <textarea
                  name="message_sent"
                  placeholder="What did you communicate to the member?"
                  value={contactForm.message_sent}
                  onChange={handleContactFormChange}
                  rows="4"
                  className="input-field"
                ></textarea>
              </div>

              <div className="form-group">
                <label>Response Received (Optional)</label>
                <textarea
                  name="response_received"
                  placeholder="What was their response?"
                  value={contactForm.response_received}
                  onChange={handleContactFormChange}
                  rows="3"
                  className="input-field"
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
                    className="input-field"
                  />
                </div>
              )}
            </div>

            <div className="form-actions modal-footer">
              <button
                type="submit"
                className="btn btn-success"
                disabled={submitting}
              >
                {submitting ? '⏳ Saving...' : '✓ Save Contact Log'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LogContactModal;
