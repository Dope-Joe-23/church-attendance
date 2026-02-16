import React, { useState, useEffect } from 'react';
import { serviceApi } from '../services/api';
import { AttendanceScanner } from '../components';
import '../styles/pages.css';

const Scanner = () => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkinCount, setCheckinCount] = useState(0);
  const [expandedParentService, setExpandedParentService] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const data = await serviceApi.getServices();
      const servicesList = data.results || data;
      setServices(servicesList);
      if (servicesList.length > 0) {
        setSelectedService(servicesList[0]);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckinSuccess = () => {
    setCheckinCount((prev) => prev + 1);
  };

  // Group services: parent services with their sessions (instances)
  const groupedServices = React.useMemo(() => {
    const parentServices = services.filter((s) => !s.parent_service);
    const instances = services.filter((s) => s.parent_service);

    return parentServices.map((parent) => ({
      parent,
      sessions: instances.filter((inst) => inst.parent_service === parent.id),
    }));
  }, [services]);

  const handleParentServiceClick = (parentId, parentService) => {
    const group = groupedServices.find((g) => g.parent.id === parentId);
    
    // If no sessions, directly select the parent service only if it's not recurring
    // (Parent recurring services are templates, can't take attendance on them)
    if (!group || group.sessions.length === 0) {
      if (parentService.is_recurring && !parentService.parent_service) {
        // This is a recurring parent service with no sessions - show error
        alert(`"${parentService.name}" is a recurring service template. Please generate or add sessions first.`);
        return;
      }
      setSelectedService(parentService);
      setExpandedParentService(null);
      return;
    }
    
    // Otherwise, toggle the dropdown
    if (expandedParentService === parentId) {
      setExpandedParentService(null);
    } else {
      setExpandedParentService(parentId);
    }
  };

  const filteredGroupedServices = React.useMemo(() => {
    const query = searchQuery.toLowerCase();
    return groupedServices.filter((group) => 
      group.parent.name.toLowerCase().includes(query) ||
      (group.parent.location && group.parent.location.toLowerCase().includes(query))
    );
  }, [groupedServices, searchQuery]);

  return (
    <div className="scanner-page">
      <div className="page-header">
        <h1>✨ Attendance Scanner</h1>
        <p className="scanner-subtitle">Real-time member check-in with QR codes</p>
      </div>

      {loading ? (
        <p>Loading services...</p>
      ) : (
        <div className="scanner-layout">
          <div className="service-selector">
            <h3>📋 Select Service Session</h3>
            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="service-list">
              {filteredGroupedServices.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', padding: '1rem' }}>No services found</p>
              ) : (
                filteredGroupedServices.map((group) => (
                  <div key={group.parent.id} className="service-group">
                    <button
                      className={`service-parent-button ${
                        expandedParentService === group.parent.id ? 'expanded' : ''
                      } ${
                        selectedService?.id === group.parent.id ? 'active' : ''
                      } ${group.sessions.length === 0 ? 'no-sessions' : ''}`}
                      onClick={() => handleParentServiceClick(group.parent.id, group.parent)}
                    >
                      <div className="service-parent-content">
                        <span className="service-name">{group.parent.name}</span>
                        <span className="session-count">
                          {group.sessions.length > 0
                            ? `${group.sessions.length} sessions`
                            : 'One-time service'}
                        </span>
                      </div>
                      {group.sessions.length > 0 && (
                        <span className="expand-icon">
                          {expandedParentService === group.parent.id ? '\u25bc' : '\u25b6'}
                        </span>
                      )}
                    </button>

                    {expandedParentService === group.parent.id && group.sessions.length > 0 && (
                      <div className="sessions-dropdown">
                        {group.sessions.length > 0 ? (
                          group.sessions.map((session) => (
                            <button
                              key={session.id}
                              className={`session-button ${
                                selectedService?.id === session.id ? 'active' : ''
                              }`}
                              onClick={() => setSelectedService(session)}
                            >
                              <div className="session-info">
                                <strong>{new Date(session.date).toLocaleDateString()}</strong>
                                <span className="session-time">
                                  {session.start_time} - {session.end_time}
                                </span>
                                {session.location && (
                                  <span className="session-location">📍 {session.location}</span>
                                )}
                              </div>
                            </button>
                          ))
                        ) : (
                          <p className="no-sessions">No sessions scheduled</p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="scanner-section">
            {selectedService && (
              <>
                <div className="scanner-header">
                  <div className="scanner-info">
                    <h4>🎯 Active Service</h4>
                    <p className="service-title">{selectedService.name}</p>
                    {selectedService.location && (
                      <p className="service-detail">📍 {selectedService.location}</p>
                    )}
                    <p className="service-detail">
                      🕐 {selectedService.start_time} - {selectedService.end_time}
                    </p>
                  </div>
                  <div className="checkin-badge">{checkinCount}</div>
                </div>
                <AttendanceScanner
                  service={selectedService}
                  onCheckinSuccess={handleCheckinSuccess}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;
