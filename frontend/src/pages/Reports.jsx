import React, { useState, useEffect } from 'react';
import { serviceApi } from '../services/api';
import { AttendanceReport, ServiceCard } from '../components';
import '../styles/pages.css';

const Reports = () => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedParentService, setExpandedParentService] = useState(null);

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
    
    // If no sessions, directly select the parent service
    if (!group || group.sessions.length === 0) {
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

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>Attendance Reports</h1>
      </div>

      {loading ? (
        <p>Loading services...</p>
      ) : (
        <div className="reports-layout">
          <div className="services-sidebar">
            <h3>Select a Service</h3>
            <div className="service-list">
              {groupedServices.map((group) => (
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
              ))}
            </div>
          </div>

          <div className="reports-content">
            {selectedService && (
              <AttendanceReport service={selectedService} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
