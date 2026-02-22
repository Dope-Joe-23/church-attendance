import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { serviceApi } from '../services/api';
import '../styles/components.css';

const MemberDetailsModal = ({
  isOpen,
  member,
  stats,
  contactLogs,
  onClose,
  onOpenLogContact,
}) => {
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [memberStats, setMemberStats] = useState(null);
  const [memberContactLogs, setMemberContactLogs] = useState([]);

  useEffect(() => {
    if (isOpen && member) {
      fetchData();
    }
  }, [isOpen, member?.id]);

  const fetchData = async () => {
    try {
      setLoadingHistory(true);
      
      // Fetch member's attendance records
      const attendanceUrl = `/attendance/?member=${member.id}&limit=100`;
      console.log('Fetching attendance from:', attendanceUrl, 'for member ID:', member.id);
      const attendanceResponse = await apiClient.get(attendanceUrl);
      let attendanceList = attendanceResponse.data.results || attendanceResponse.data || [];
      
      // CRITICAL: Filter locally because backend filter isn't working
      // The API returns records for all members, we need only this member's records
      attendanceList = attendanceList.filter(record => record.member === member.id);
      console.log('Attendance records after filtering:', attendanceList.length, 'records for member', member.id);
      console.log('Filtered attendance data:', attendanceList);
      
      setAttendanceHistory(Array.isArray(attendanceList) ? attendanceList : []);
      
      // Fetch all services
      try {
        console.log('Fetching all services...');
        const servicesData = await serviceApi.getServices();
        const servicesList = servicesData.results || servicesData || [];
        console.log('Services fetched:', servicesList.length, servicesList);
        setAllServices(Array.isArray(servicesList) ? servicesList : []);
      } catch (err) {
        console.warn('Failed to fetch services:', err);
        setAllServices([]);
      }

      // Fetch contact logs for this member
      try {
        const contactUrl = `/members/contact-logs/by_member/?member_id=${member.id}`;
        console.log('Fetching contact logs from:', contactUrl);
        const contactResponse = await apiClient.get(contactUrl);
        const contactList = contactResponse.data.results || contactResponse.data || [];
        console.log('Contact logs fetched:', contactList.length, contactList);
        setMemberContactLogs(Array.isArray(contactList) ? contactList : []);
      } catch (err) {
        console.warn('Failed to fetch contact logs:', err);
        setMemberContactLogs([]);
      }

      // Calculate stats if not provided
      if (!stats) {
        const calculated = calculateStats(attendanceList);
        console.log('Calculated stats:', calculated);
        setMemberStats(calculated);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setAttendanceHistory([]);
      setAllServices([]);
      setMemberContactLogs([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const calculateStats = (attendanceList) => {
    if (!attendanceList || attendanceList.length === 0) {
      return {
        total_services: 0,
        present_count: 0,
        absent_count: 0,
        attendance_percentage: 0,
        consecutive_absences: 0,
        engagement_score: 100,
        attendance_status: 'active',
        last_attendance_date: 'No record',
        last_contact_date: 'Not contacted yet',
      };
    }

    const total = attendanceList.length;
    const present = attendanceList.filter(a => a.status === 'present').length;
    const absent = attendanceList.filter(a => a.status === 'absent').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    // Calculate consecutive absences (last recent records)
    let consecutive = 0;
    for (let i = 0; i < attendanceList.length; i++) {
      if (attendanceList[i].status === 'absent') {
        consecutive++;
      } else {
        break;
      }
    }

    // Get last attendance date
    const lastAttendance = attendanceList.find(a => a.status === 'present');
    const lastAttendanceDate = lastAttendance 
      ? new Date(lastAttendance.service_date || lastAttendance.created_at).toLocaleDateString()
      : 'No record';

    return {
      total_services: total,
      present_count: present,
      absent_count: absent,
      attendance_percentage: percentage,
      consecutive_absences: consecutive,
      engagement_score: Math.max(0, 100 - (absent * 10)),
      attendance_status: percentage >= 75 ? 'active' : percentage >= 50 ? 'at_risk' : 'critical',
      last_attendance_date: lastAttendanceDate,
      last_contact_date: 'Not contacted yet',
    };
  };

  const getServiceAttendanceMap = () => {
    const attendanceMap = {};
    attendanceHistory.forEach(record => {
      attendanceMap[record.service] = record;
    });
    return attendanceMap;
  };

  const organizeServicesByType = () => {
    const attendanceMap = getServiceAttendanceMap();
    const parentServices = {};
    const singleServices = [];

    allServices.forEach(service => {
      if (service.is_recurring && !service.parent_service && !service.date) {
        if (!parentServices[service.id]) {
          parentServices[service.id] = {
            parent: service,
            instances: [],
          };
        }
        return;
      }

      if (service.parent_service) {
        if (!parentServices[service.parent_service]) {
          parentServices[service.parent_service] = {
            parent: null,
            instances: [],
          };
        }
        parentServices[service.parent_service].instances.push({
          service: service,
          attendance: attendanceMap[service.id],
        });
      } else if (!service.is_recurring) {
        singleServices.push({
          service: service,
          attendance: attendanceMap[service.id],
        });
      }
    });

    Object.values(parentServices).forEach(parent => {
      parent.instances.sort((a, b) => 
        new Date(b.service.date) - new Date(a.service.date)
      );
    });

    singleServices.sort((a, b) => 
      new Date(b.service.date || 0) - new Date(a.service.date || 0)
    );

    return { parentServices, singleServices };
  };

  if (!isOpen || !member) return null;

  const displayStats = stats || memberStats;
  const displayContactLogs = contactLogs || memberContactLogs;
  const handleLogContact = onOpenLogContact || (() => alert('Contact logging not available'));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content member-details-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-section">
            <h2>{member.full_name}</h2>
            <p className="member-id">ID: {member.member_id}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="modal-body member-details-body">
          <div className="modal-content-container">
            
            {/* Contact Information - ROW */}
            <div className="info-row-container">
              <h4>📋 Contact Information</h4>
              <div className="contact-info">
                <div className="info-row">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{member.email || 'Not provided'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Phone:</span>
                  <span className="info-value">{member.phone || 'Not provided'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Group:</span>
                  <span className="info-value">{member.group || 'Not assigned'}</span>
                </div>
              </div>
            </div>

            {/* Attendance Trend - ROW */}
            {allServices && allServices.length > 0 && (
              <div className="info-row-container">
                <h4>📈 Attendance by Service</h4>
                <div className="attendance-trend-grouped">
                  {(() => {
                    const { parentServices, singleServices } = organizeServicesByType();

                    return (
                      <>
                        {/* Single (One-time) Services */}
                        {singleServices.length > 0 && (
                          <div>
                            <h6 className="service-category-header">One-Time Services</h6>
                            {singleServices.slice(0, 12).map(item => (
                              <div key={`single_${item.service.id}`} className="service-attendance-item">
                                <div className="service-info">
                                  <span className="service-title">{item.service.name}</span>
                                  <span className="service-date">
                                    {item.service.date 
                                      ? new Date(item.service.date).toLocaleDateString()
                                      : 'No date'}
                                  </span>
                                </div>
                                <div className="attendance-status">
                                  <div
                                    className={`status-indicator ${item.attendance?.status || 'not-attended'}`}
                                    title={item.attendance 
                                      ? `${item.attendance.status}${item.attendance.is_auto_marked ? ' (auto-marked)' : ''}`
                                      : 'No attendance record'}
                                  >
                                    {item.attendance?.status === 'present' 
                                      ? '✓' 
                                      : item.attendance?.status === 'absent' 
                                      ? '✗' 
                                      : '—'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Recurring Services */}
                        {Object.entries(parentServices).length > 0 && (
                          <div>
                            <h6 className="service-category-header">Recurring Services</h6>
                            {Object.entries(parentServices)
                              .filter(([_, parent]) => parent.instances.length > 0)
                              .map(([parentId, parent]) => {
                                const parentName = parent.parent?.name || parent.instances[0]?.service?.name || 'Recurring Service';
                                const recurrencePattern = parent.parent?.recurrence_pattern || 'Recurring';
                                
                                return (
                                  <div key={`recurring_${parentId}`} className="service-attendance-group">
                                    <div className="service-header-row">
                                      <h5 className="service-name">
                                        {parentName}
                                        {' '}
                                        <span className="recurrence-badge">
                                          {recurrencePattern}
                                        </span>
                                      </h5>
                                    </div>
                                    <div className="recurring-instances">
                                      {parent.instances.slice(0, 12).map(instance => (
                                        <div key={instance.service.id} className="instance-row">
                                          <span className="instance-date">
                                            {new Date(instance.service.date).toLocaleDateString()}
                                          </span>
                                          <div
                                            className={`status-indicator ${instance.attendance?.status || 'not-attended'}`}
                                            title={instance.attendance 
                                              ? `${instance.attendance.status}${instance.attendance.is_auto_marked ? ' (auto-marked)' : ''}`
                                              : 'No attendance record'}
                                          >
                                            {instance.attendance?.status === 'present' 
                                              ? '✓' 
                                              : instance.attendance?.status === 'absent' 
                                              ? '✗' 
                                              : '—'}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <div className="trend-legend">
                    <div className="legend-item">
                      <span className="legend-dot present"></span>
                      <span>Present</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot absent"></span>
                      <span>Absent</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot not-attended"></span>
                      <span>Not Recorded</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Key Statistics - ROW */}
            {displayStats && (
              <div className="info-row-container">
                <h4>📊 Key Metrics</h4>
                <div className="key-stats-rows">
                  <div className="key-stat-row">
                    <span className="stat-label">Consecutive Absences:</span>
                    <span className="stat-value-large">{displayStats.consecutive_absences}</span>
                  </div>

                  <div className="key-stat-row">
                    <span className="stat-label">Engagement Score:</span>
                    <div className="stat-display">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${displayStats.engagement_score}%` }}
                        ></div>
                      </div>
                      <span className="stat-value-small">{Math.round(displayStats.engagement_score)}/100</span>
                    </div>
                  </div>

                  <div className="key-stat-row">
                    <span className="stat-label">Attendance Percentage:</span>
                    <span className="stat-value-large">{displayStats.attendance_percentage}%</span>
                  </div>

                  <div className="key-stat-row">
                    <span className="stat-label">Status:</span>
                    <span className={`status-badge ${displayStats.attendance_status}`}>
                      {displayStats.attendance_status}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Contact History - ROW */}
            {displayContactLogs && displayContactLogs.length > 0 && (
              <div className="info-row-container">
                <h4>📞 Recent Contacts ({displayContactLogs.length})</h4>
                <div className="contact-history-compact">
                  {displayContactLogs.slice(0, 3).map(log => (
                    <div key={log.id} className="contact-history-item">
                      <span className="contact-method-badge">{log.contact_method.toUpperCase()}</span>
                      <span className="contact-date">{new Date(log.contact_date).toLocaleDateString()}</span>
                      <p className="contact-summary">{log.message_sent.substring(0, 60)}...</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pastoral Notes - ROW */}
            {member.pastoral_notes && (
              <div className="info-row-container">
                <h4>📝 Pastoral Notes</h4>
                <div className="pastoral-notes">
                  <p>{member.pastoral_notes}</p>
                </div>
              </div>
            )}

            {/* Last Activity - ROW */}
            <div className="info-row-container">
              <h4>⏰ Last Activity</h4>
              <div className="last-activity">
                <div className="activity-row">
                  <span>Last Attendance:</span>
                  <strong>{displayStats?.last_attendance_date || 'No record'}</strong>
                </div>
                <div className="activity-row">
                  <span>Last Contact:</span>
                  <strong>{displayStats?.last_contact_date || 'Not contacted yet'}</strong>
                </div>
              </div>
            </div>

            {/* Action Button - ROW */}
            <div className="info-row-container button-container">
              <button
                className="btn btn-primary full-width"
                onClick={() => handleLogContact(member)}
              >
                📞 Log Contact with this Member
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDetailsModal;
