import React, { useState, useEffect } from 'react';
import { serviceApi } from '../services/api';
import { AttendanceScanner } from '../components';
import '../styles/pages.css';

const Scanner = () => {
  const [services, setServices] = useState([]);
  const [groupedServices, setGroupedServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
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

  return (
    <div className="scanner-page">
      <div className="page-header">
        <h1>✨ Attendance Scanner</h1>
        <p className="scanner-subtitle">Real-time member check-in with QR codes</p>
      </div>

      {loading ? (
        <p>Loading services...</p>
      ) : (
        <>
          {/* Service Selection List */}
          <div className="scanner-services-container">
            <div className="services-list-header">
              <h2>Available Services & Sessions</h2>
              <p>Select a session to start scanning QR codes</p>
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
              <div className="services-with-sessions">
                {filteredServices.map((parentService) => (
                  <div key={parentService.id} className="service-with-sessions-group">
                    {/* Parent Service at Top */}
                    <div className="parent-service-container">
                      <div className="service-card-icon">📱</div>
                      <div className="service-card-content">
                        <h3>{parentService.name}</h3>
                        {parentService.location && (
                          <p className="service-location">📍 {parentService.location}</p>
                        )}
                        {parentService.start_time && (
                          <p className="service-time">⏰ {parentService.start_time}</p>
                        )}
                        {parentService.is_recurring && (
                          <p className="service-badge">🔄 Recurring Service</p>
                        )}
                      </div>
                    </div>

                    {/* Sessions Below */}
                    {parentService.sessions && parentService.sessions.length > 0 && (
                      <>
                        {parentService.is_recurring ? (
                          // Collapsible container for recurring services
                          <div className="sessions-dropdown-container">
                            <div
                              className="dropdown-toggle"
                              onClick={() => toggleExpandService(parentService.id)}
                            >
                              <span className="toggle-arrow">
                                {expandedService === parentService.id ? '▼' : '▶'}
                              </span>
                              <span className="toggle-text">
                                {parentService.sessions.length} session{parentService.sessions.length !== 1 ? 's' : ''} available
                              </span>
                            </div>
                            {expandedService === parentService.id && (
                              <div className="sessions-list">
                                {parentService.sessions.map((session) => (
                                  <div
                                    key={session.id}
                                    className="session-item"
                                    onClick={() => handleServiceSelect(session)}
                                  >
                                    <div className="session-info">
                                      <h4>{session.name}</h4>
                                      {session.location && (
                                        <p className="session-location">📍 {session.location}</p>
                                      )}
                                      {session.date && (
                                        <p className="session-datetime">
                                          📅 {new Date(session.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                          })}
                                        </p>
                                      )}
                                      {session.start_time && (
                                        <p className="session-time">⏰ {session.start_time}</p>
                                      )}
                                    </div>
                                    <div className="session-arrow">→</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          // Show sessions directly for non-recurring services
                          <div className="sessions-list direct-sessions">
                            {parentService.sessions.map((session) => (
                              <div
                                key={session.id}
                                className="session-item"
                                onClick={() => handleServiceSelect(session)}
                              >
                                <div className="session-info">
                                  <h4>{session.name}</h4>
                                  {session.location && (
                                    <p className="session-location">📍 {session.location}</p>
                                  )}
                                  {session.date && (
                                    <p className="session-datetime">
                                      📅 {new Date(session.date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </p>
                                  )}
                                  {session.start_time && (
                                    <p className="session-time">⏰ {session.start_time}</p>
                                  )}
                                </div>
                                <div className="session-arrow">→</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scanner Modal */}
          {showScannerModal && selectedService && (
            <div className="modal-overlay" onClick={handleCloseModal}>
              <div className="modal-content scanner-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-header-content">
                    <h2>{selectedService.name}</h2>
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
    </div>
  );
};

export default Scanner;
