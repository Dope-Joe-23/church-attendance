import React, { useState, useEffect } from 'react';
import { serviceApi } from '../services/api';
import { AttendanceReport, LoadingSpinner } from '../components';
import { LIST_BATCH_SIZE, sortByMostRecent } from '../utils/listPagination';
import { MdEvent, MdLocationOn, MdRepeat, MdSearch } from 'react-icons/md';
import '../styles/pages.css';

const Reports = () => {
  const [services, setServices] = useState([]);
  const [groupedServices, setGroupedServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleServiceCount, setVisibleServiceCount] = useState(LIST_BATCH_SIZE);
  const [visibleSessionCounts, setVisibleSessionCounts] = useState({});
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
        const grouped = sortByMostRecent(parentServices).map(parent => ({
          ...parent,
          sessions: sortByMostRecent(
            childSessions.filter(session => session.parent_service === parent.id),
            'date'
          )
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
  const visibleServices = filteredServices.slice(0, visibleServiceCount);
  const getVisibleSessions = (service) => (
    service.sessions.slice(0, visibleSessionCounts[service.id] || LIST_BATCH_SIZE)
  );
  const loadMoreSessions = (serviceId) => {
    setVisibleSessionCounts((counts) => ({
      ...counts,
      [serviceId]: (counts[serviceId] || LIST_BATCH_SIZE) + LIST_BATCH_SIZE,
    }));
  };

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

  const totalSessions = groupedServices.reduce((sum, service) => sum + service.sessions.length, 0);

  return (
    <div className="reports-page">
      {loading ? (
        <LoadingSpinner message="Loading services..." />
      ) : (
        <>
          {/* Services Selection Grid */}
          <div className="reports-services-container">
            <div className="services-list-header">
              <h2>Available Services & Sessions</h2>
              <p>Open a service or session to view detailed attendance records.</p>
            </div>

            <div className="search-box search-box-with-icon" style={{ marginBottom: '2rem' }}>
              <MdSearch className="search-icon" size={18} aria-hidden="true" />
              <input
                type="text"
                aria-label="Search services and locations"
                placeholder="Search services or locations..."
                value={searchQuery}
                onChange={(e) => {
                  setVisibleServiceCount(LIST_BATCH_SIZE);
                  setSearchQuery(e.target.value);
                }}
                className="search-input"
              />
            </div>

            {filteredServices.length === 0 ? (
              <div className="empty-state">
                <p>No services found. Create a service to start tracking attendance.</p>
              </div>
            ) : (
              <>
              <div className="mobile-service-cards">
                {visibleServices.map((parentService) => (
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
                          getVisibleSessions(parentService).map((session) => (
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
                        {getVisibleSessions(parentService).length < parentService.sessions.length && (
                          <button
                            type="button"
                            className="btn btn-secondary load-more-button"
                            onClick={() => loadMoreSessions(parentService.id)}
                          >
                            Load more sessions
                          </button>
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
                  {visibleServices.map((parentService) => (
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
                            {parentService.is_recurring
                              ? <><MdRepeat aria-hidden="true" /> Recurring</>
                              : <><MdEvent aria-hidden="true" /> One-time</>}
                          </span>
                        </td>
                        <td></td>
                      </tr>

                      {/* Session Rows (expanded) */}
                      {expandedService === parentService.id &&
                        parentService.sessions &&
                        parentService.sessions.length > 0 &&
                        getVisibleSessions(parentService).map((session) => (
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
                              <span className="service-type session"><MdEvent aria-hidden="true" /> Session</span>
                            </td>
                            <td></td>
                          </tr>
                        ))}
                      {expandedService === parentService.id &&
                        getVisibleSessions(parentService).length < parentService.sessions.length && (
                          <tr className="session-load-more-row">
                            <td colSpan={8}>
                              <button
                                type="button"
                                className="btn btn-secondary load-more-button"
                                onClick={() => loadMoreSessions(parentService.id)}
                              >
                                Load more sessions
                              </button>
                            </td>
                          </tr>
                        )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              {filteredServices.length > 0 && (
                <div className="list-pagination" aria-live="polite">
                  <p className="list-pagination-count">
                    Showing {visibleServices.length} of {filteredServices.length} services
                  </p>
                  {visibleServices.length < filteredServices.length && (
                    <button
                      type="button"
                      className="btn btn-secondary load-more-button"
                      onClick={() => setVisibleServiceCount((count) => count + LIST_BATCH_SIZE)}
                    >
                      Load more services
                    </button>
                  )}
                </div>
              )}
              </>
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
                      <p className="modal-subtext"><MdLocationOn aria-hidden="true" /> {selectedService.location}</p>
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
