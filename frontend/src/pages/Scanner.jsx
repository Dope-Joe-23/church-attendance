import React, { useState, useEffect } from 'react';
import { serviceApi, memberApi } from '../services/api';
import { AttendanceScanner, LoadingSpinner, MembersTable, MemberFormModal } from '../components';
import '../styles/pages.css';

const formatServiceDate = (date) => {
  if (!date) return 'No date set';

  return new Date(date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatServiceTime = (time) => {
  if (!time) return null;

  return time.slice(0, 5);
};

const Scanner = () => {
  const [groupedServices, setGroupedServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedService, setExpandedService] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [memberSearch, setMemberSearch] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    sex: '',
    phone: '',
    email: '',
    place_of_residence: '',
    profession: '',
    department: '',
    class_name: '',
    committee: '',
    marital_status: '',
    is_visitor: false,
    baptised: false,
    confirmed: false,
  });

  useEffect(() => {
    fetchServices();
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setMembersLoading(true);
    try {
      const data = await memberApi.getMembers();
      const membersList = data.results || data;
      setMembers(membersList);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const data = await serviceApi.getServices();
      const servicesList = data.results || data;
      
      if (Array.isArray(servicesList)) {
        // Separate parent services and their sessions
        const parentServices = servicesList.filter(s => s.parent_service === null);
        const childSessions = servicesList.filter(s => s.parent_service !== null);
        
        // Group sessions by parent service
        const grouped = parentServices.map(parent => ({
          ...parent,
          sessions: childSessions.filter(session => session.parent_service === parent.id)
        }));
        
        setGroupedServices(grouped);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = groupedServices.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (service.location && service.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
    service.sessions.some(session =>
      session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (session.location && session.location.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setShowScannerModal(true);
  };

  const toggleExpandService = (serviceId) => {
    setExpandedService(expandedService === serviceId ? null : serviceId);
  };

  const handleCloseModal = () => {
    setShowScannerModal(false);
  };

  const handleEdit = (member) => {
    setFormData({
      full_name: member.full_name,
      date_of_birth: member.date_of_birth || '',
      sex: member.sex || '',
      phone: member.phone || '',
      email: member.email || '',
      place_of_residence: member.place_of_residence || '',
      profession: member.profession || '',
      department: member.department || '',
      class_name: member.class_name || '',
      committee: member.committee || '',
      marital_status: member.marital_status || '',
      is_visitor: member.is_visitor || false,
      baptised: member.baptised || false,
      confirmed: member.confirmed || false,
    });
    setEditingId(member.id);
    setFormError(null);
    setShowFormModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this member?')) {
      try {
        await memberApi.deleteMember(id);
        fetchMembers();
      } catch (error) {
        console.error('Error deleting member:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      date_of_birth: '',
      sex: '',
      phone: '',
      email: '',
      place_of_residence: '',
      profession: '',
      department: '',
      class_name: '',
      committee: '',
      marital_status: '',
      is_visitor: false,
      baptised: false,
      confirmed: false,
    });
    setEditingId(null);
    setFormError(null);
    setShowFormModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setFormError('Full name is required');
      return;
    }
    
    if (!formData.is_visitor && !formData.email.trim() && !formData.phone.trim()) {
      setFormError('Non-visitor members must have at least one contact method (email or phone)');
      return;
    }

    const cleanedData = {
      full_name: formData.full_name.trim(),
      date_of_birth: formData.date_of_birth || null,
      sex: formData.sex || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      place_of_residence: formData.place_of_residence?.trim() || null,
      profession: formData.profession?.trim() || null,
      department: formData.department || null,
      class_name: formData.class_name || null,
      committee: formData.committee || null,
      marital_status: formData.marital_status || null,
      is_visitor: formData.is_visitor,
      baptised: formData.baptised,
      confirmed: formData.confirmed,
    };

    setIsSubmittingForm(true);
    try {
      if (editingId) {
        await memberApi.updateMember(editingId, cleanedData);
      } else {
        await memberApi.createMember(cleanedData);
      }
      await fetchMembers();
      resetForm();
    } catch (error) {
      console.error('Error saving member:', error);
      const errorData = error.response?.data;
      let errorMsg = 'Failed to save member';
      if (typeof errorData === 'string') {
        errorMsg = errorData;
      } else if (errorData?.detail) {
        errorMsg = errorData.detail;
      } else if (errorData?.non_field_errors) {
        errorMsg = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors;
      } else if (typeof errorData === 'object') {
        for (const [field, messages] of Object.entries(errorData)) {
          if (Array.isArray(messages)) { errorMsg = messages[0]; break; }
          if (typeof messages === 'string') { errorMsg = messages; break; }
        }
      }
      setFormError(errorMsg);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const filteredMembers = members.filter((member) => {
    if (!memberSearch.trim()) return true;
    const query = memberSearch.toLowerCase().trim();
    return (
      (member.full_name && member.full_name.toLowerCase().includes(query)) ||
      (member.email && member.email.toLowerCase().includes(query)) ||
      (member.phone && member.phone.toLowerCase().includes(query)) ||
      (member.member_id && member.member_id.toLowerCase().includes(query))
    );
  });

  const selectedServiceTime = selectedService
    ? [formatServiceTime(selectedService.start_time), formatServiceTime(selectedService.end_time)]
        .filter(Boolean)
        .join(' - ')
    : '';

  return (
    <div className="scanner-page">
      {loading ? (
        <LoadingSpinner message="Loading services..." />
      ) : (
        <>
          {/* Service Selection List */}
          <div className="scanner-services-container">
            <div className="services-list-header">
              <h2>Available Services & Sessions</h2>
              <p>Select a one-time service or expand a recurring service to choose a session.</p>
            </div>

            <div className="search-box" style={{ marginBottom: '2rem' }}>
              <input
                type="text"
                placeholder="🔍 Search services or locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            {filteredServices.length === 0 ? (
              <div className="empty-state">
                <p>No services found. Please create one to start checking in members.</p>
              </div>
            ) : (
              <>
              <div className="mobile-service-cards">
                {filteredServices.map((parentService) => (
                  <div key={parentService.id} className="mobile-service-card">
                    <button
                      type="button"
                      className="mobile-service-card-main"
                      onClick={() => {
                        if (!parentService.is_recurring) {
                          handleServiceSelect(parentService);
                        } else {
                          toggleExpandService(parentService.id);
                        }
                      }}
                    >
                      <span className="mobile-service-title">{parentService.name}</span>
                      <span className={`service-type ${parentService.is_recurring ? 'recurring' : 'onetime'}`}>
                        {parentService.is_recurring ? 'Recurring' : 'One-time'}
                      </span>
                      <span className="mobile-service-meta">
                        {parentService.location || 'No location'} · {parentService.date || `${parentService.sessions.length} sessions`}
                      </span>
                    </button>
                    {parentService.is_recurring && expandedService === parentService.id && (
                      <div className="mobile-session-list">
                        {parentService.sessions.length > 0 ? (
                          parentService.sessions.map((session) => (
                            <button
                              key={session.id}
                              type="button"
                              className="mobile-session-card"
                              onClick={() => handleServiceSelect(session)}
                            >
                              <span>{session.name}</span>
                              <small>{session.date || 'No date'} · {session.start_time || 'No time'} · {session.location || 'No location'}</small>
                            </button>
                          ))
                        ) : (
                          <p className="mobile-empty-sessions">No sessions have been added yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <table className="services-table desktop-service-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>Service/Session</th>
                    <th>Location</th>
                    <th>Date</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((parentService) => (
                    <React.Fragment key={parentService.id}>
                      {/* Parent Service Row */}
                      <tr
                        className="service-row"
                        onClick={() => {
                          if (!parentService.is_recurring) {
                            // One-time service: open modal
                            handleServiceSelect(parentService);
                          } else if (parentService.sessions && parentService.sessions.length > 0) {
                            // Recurring with sessions: toggle expand
                            toggleExpandService(parentService.id);
                          }
                          // Recurring without sessions: do nothing
                        }}
                        style={{
                          cursor:
                            !parentService.is_recurring || (parentService.sessions && parentService.sessions.length > 0)
                              ? 'pointer'
                              : 'default'
                        }}
                      >
                        <td className="expand-cell">
                          {parentService.sessions && parentService.sessions.length > 0 && (
                            <button
                              className="expand-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandService(parentService.id);
                              }}
                              title={expandedService === parentService.id ? 'Collapse' : 'Expand'}
                            >
                              {expandedService === parentService.id ? '▼' : '▶'}
                            </button>
                          )}
                        </td>
                        <td className="service-name">
                          <strong>{parentService.name}</strong>
                        </td>
                        <td>{parentService.location || '—'}</td>
                        <td>{parentService.date || '—'}</td>
                        <td>{parentService.start_time || '—'}</td>
                        <td>{parentService.end_time || '—'}</td>
                        <td>
                          <span className={`service-type ${parentService.is_recurring ? 'recurring' : 'onetime'}`}>
                            {parentService.is_recurring ? '🔄 Recurring' : '📅 One-time'}
                          </span>
                        </td>
                        <td></td>
                      </tr>

                      {/* Session Rows (expanded) */}
                      {expandedService === parentService.id &&
                        parentService.sessions &&
                        parentService.sessions.length > 0 &&
                        parentService.sessions.map((session) => (
                          <tr
                            key={session.id}
                            className="session-row"
                            onClick={() => handleServiceSelect(session)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td></td>
                            <td className="session-name">
                              <span style={{ marginLeft: '20px' }}>└─ {session.name}</span>
                            </td>
                            <td>{session.location || '—'}</td>
                            <td>{session.date || '—'}</td>
                            <td>{session.start_time || '—'}</td>
                            <td>{session.end_time || '—'}</td>
                            <td>
                              <span className="service-type session">📅 Session</span>
                            </td>
                            <td></td>
                          </tr>
                        ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              </>
            )}
          </div>

          {/* Scanner Modal */}
          {showScannerModal && selectedService && (
            <div className="modal-overlay" onClick={handleCloseModal}>
              <div className="modal-content scanner-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header scanner-modal-header">
                  <div className="modal-header-content scanner-modal-title-block">
                    <span className="scanner-modal-kicker">
                      {selectedService.parent_service ? 'Session check-in' : 'Service check-in'}
                    </span>
                    <h2>{selectedService.name}</h2>
                    <div className="scanner-modal-meta">
                      <span>{formatServiceDate(selectedService.date)}</span>
                      {selectedServiceTime && <span>{selectedServiceTime}</span>}
                      {selectedService.location && <span>{selectedService.location}</span>}
                    </div>
                    {selectedService.location && (
                      <p className="modal-subtext">📍 {selectedService.location}</p>
                    )}
                  </div>
                  <button className="modal-close-btn" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="modal-body scanner-modal-body">
                  <AttendanceScanner service={selectedService} />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Members Directory Section */}
      <div className="scanner-members-section" style={{ marginTop: '2rem' }}>
        <div className="scanner-services-container">
          <div className="services-list-header">
            <h2>Member Directory</h2>
            <p>Search and view church members.</p>
          </div>

          <div className="search-action-bar" style={{ marginBottom: '1.5rem' }}>
            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Search by name, email, phone or member ID..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {membersLoading ? (
            <LoadingSpinner message="Loading members..." />
          ) : (
            <>
              {filteredMembers.length === 0 && memberSearch && (
                <div className="no-results">
                  <p>No members match your search criteria.</p>
                </div>
              )}
              <div className="members-table-wrapper">
                <MembersTable
                  members={filteredMembers}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <MemberFormModal
        isOpen={showFormModal}
        isEditing={!!editingId}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmit}
        onClose={resetForm}
        error={formError}
        isSubmitting={isSubmittingForm}
      />
    </div>
  );
};

export default Scanner;
