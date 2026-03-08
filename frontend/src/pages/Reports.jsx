import React, { useState, useEffect } from 'react';
import { serviceApi } from '../services/api';
import { AttendanceReport } from '../components';
import '../styles/pages.css';

const Reports = () => {
  const [services, setServices] = useState([]);
  const [groupedServices, setGroupedServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedService, setExpandedService] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

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
        setServices(servicesList);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      setServices([]);
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
    setShowReportModal(true);
  };

  const toggleExpandService = (serviceId) => {
    setExpandedService(expandedService === serviceId ? null : serviceId);
  };

  const handleCloseModal = () => {
    setShowReportModal(false);
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>📊 Attendance Reports</h1>
        <p>View attendance data for church services and sessions</p>
      </div>

      {loading ? (
        <p>Loading services...</p>
      ) : (
        <>
          {/* Services Selection Grid */}
          <div className="reports-services-container">
            <div className="services-list-header">
              <h2>Available Services & Sessions</h2>
              <p>Click on a session to view attendance details</p>
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
                <p>No services found. Create a service to start tracking attendance.</p>
              </div>
            ) : (
              <table className="services-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>Service/Session</th>
                    <th>Location</th>
                    <th>Date</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Type</th>
                    <th style={{ width: '100px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((parentService) => (
                    <React.Fragment key={parentService.id}>
                      {/* Parent Service Row */}
                      <tr
                        className="service-row"
                        onClick={() => parentService.sessions && parentService.sessions.length > 0 && toggleExpandService(parentService.id)}
                        style={{ cursor: parentService.sessions && parentService.sessions.length > 0 ? 'pointer' : 'default' }}
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
                        <td onClick={(e) => e.stopPropagation()}>
                          {!parentService.is_recurring && (
                            <button
                              className="btn-select"
                              onClick={() => handleServiceSelect(parentService)}
                            >
                              Select
                            </button>
                          )}
                        </td>
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
                            <td>
                              <button
                                className="btn-select"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleServiceSelect(session);
                                }}
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Report Modal */}
          {showReportModal && selectedService && (
            <div className="modal-overlay" onClick={handleCloseModal}>
              <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-header-content">
                    <h2>{selectedService.name}</h2>
                    {selectedService.location && (
                      <p className="modal-subtext">📍 {selectedService.location}</p>
                    )}
                  </div>
                  <button className="modal-close-btn" onClick={handleCloseModal}>✕</button>
                </div>
                <div className="modal-body report-modal-body">
                  <AttendanceReport service={selectedService} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
