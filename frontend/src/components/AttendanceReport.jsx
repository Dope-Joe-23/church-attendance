import React, { useState, useEffect } from 'react';
import { attendanceApi } from '../services/api';
import '../styles/components.css';

// Mapping for group display names
const GROUP_LABELS = {
  'group_a': 'Group A',
  'group_b': 'Group B',
  'group_c': 'Group C',
  'group_d': 'Group D',
};

const AttendanceReport = ({ service }) => {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [markingAbsent, setMarkingAbsent] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (service) {
      // Check if this is a parent recurring service (template/label)
      // Parent services have: is_recurring=true, parent_service=null, date=null
      if (service.is_recurring && !service.parent_service && !service.date) {
        setError(`"${service.name}" is a recurring service template. Please select a specific session/date to view attendance.`);
        setAttendance(null);
        return;
      }

      fetchAttendance();
      
      // Check if service has ended and auto-mark absent if needed
      checkAndMarkAbsentIfServiceEnded();
    }
  }, [service]);

  const checkAndMarkAbsentIfServiceEnded = () => {
    if (!service || !service.end_time) return;
    
    // Use the service's end time (session-specific if it's a recurring instance, or service-specific if one-off)
    const now = new Date();
    const serviceDate = new Date(service.date);
    const [endHours, endMinutes] = service.end_time.split(':');
    const serviceEndTime = new Date(serviceDate.getFullYear(), serviceDate.getMonth(), serviceDate.getDate(), parseInt(endHours), parseInt(endMinutes));
    
    // If service has ended more than 1 minute ago and we haven't marked absent yet
    if (now > serviceEndTime && serviceEndTime.getTime() > (now.getTime() - 60000)) {
      // Auto-mark absent (silently, without confirmation)
      autoMarkAbsent();
    }
  };

  const autoMarkAbsent = async () => {
    try {
      await attendanceApi.markAbsent(service.id);
      // Refresh attendance data quietly
      setTimeout(() => {
        fetchAttendance();
      }, 1000);
    } catch (err) {
      // Silently fail - don't disrupt user experience
      console.log('Auto-mark absent completed or service already marked');
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await attendanceApi.getAttendanceByService(service.id);
      setAttendance(data);
    } catch (err) {
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAbsent = async () => {
    if (
      !window.confirm(
        'Are you sure? This will mark all members who haven\'t checked in as absent.'
      )
    ) {
      return;
    }

    setMarkingAbsent(true);
    setSuccessMessage('');
    try {
      const result = await attendanceApi.markAbsent(service.id);
      setSuccessMessage(result.message);
      // Refresh attendance data
      setTimeout(() => {
        fetchAttendance();
        setSuccessMessage('');
      }, 2000);
    } catch (err) {
      setSuccessMessage('Error: Failed to mark members as absent');
    } finally {
      setMarkingAbsent(false);
    }
  };

  if (!service) {
    return (
      <div className="report-container">
        <p>Select a service to view attendance report</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="report-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-container">
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="report-container">
      <h2>Attendance Report</h2>
      {attendance && (
        <>
          <div className="report-header">
            <h3>{attendance.service.name}</h3>
            <p>{new Date(attendance.service.date).toLocaleDateString()}</p>
          </div>

          <div className="summary-stats">
            <div className="stat present">
              <h4>Present</h4>
              <p>{attendance.total_present}</p>
            </div>
            <div className="stat absent">
              <h4>Absent</h4>
              <p>{attendance.total_absent}</p>
            </div>
            <div className="stat late">
              <h4>Late</h4>
              <p>{attendance.total_late}</p>
            </div>
          </div>

          {successMessage && (
            <div className="success-message">{successMessage}</div>
          )}

          <button
            onClick={handleMarkAbsent}
            disabled={markingAbsent}
            className="btn btn-warning"
            style={{ marginBottom: '1.5rem' }}
          >
            {markingAbsent ? 'Marking...' : 'Mark Remaining as Absent'}
          </button>

          <div className="attendance-table">
            <table>
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Contact Information</th>
                  <th>Group</th>
                  <th>Status</th>
                  <th>Check-in Time</th>
                </tr>
              </thead>
              <tbody>
                {attendance.attendances.map((record) => (
                  <tr key={record.id}>
                    <td>{record.member_details.full_name}</td>
                    <td>
                      <div className="contact-info">
                        {record.member_details.email && (
                          <div className="email">📧 {record.member_details.email}</div>
                        )}
                        {record.member_details.phone && (
                          <div className="phone">📱 {record.member_details.phone}</div>
                        )}
                        {!record.member_details.email && !record.member_details.phone && (
                          <span className="no-contact">—</span>
                        )}
                      </div>
                    </td>
                    <td>{GROUP_LABELS[record.member_details.group] || record.member_details.group || '—'}</td>
                    <td>
                      <span className={`status-badge status-${record.status}`}>
                        {record.status.charAt(0).toUpperCase() +
                          record.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      {new Date(record.check_in_time).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceReport;
