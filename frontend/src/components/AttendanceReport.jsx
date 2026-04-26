import React, { useState, useEffect } from 'react';
import { attendanceApi } from '../services/api';
import '../styles/components.css';

// Mapping for class display names
const CLASS_LABELS = {
  'airport': 'Airport',
  'abesim': 'Abesim',
  'old_abesim': 'Old Abesim',
  'asufufu_adomako': 'Asufufu / Adomako',
  'baakoniaba': 'Baakoniaba',
  'berlin_top_class_1': 'Berlin Top class 1',
  'berlin_top_class_2': 'Berlin Top class 2',
  'penkwase_class_1': 'Penkwase class 1',
  'penkwase_class_2': 'Penkwase class 2',
  'mayfair': 'Mayfair',
  'odumase': 'Odumase',
  'new_dormaa_kotokrom': 'New Dormaa / Kotokrom',
  'dumasua': 'Dumasua',
  'fiapre_class_1': 'Fiapre Class 1',
  'fiapre_class_2': 'Fiapre Class 2',
  'magazine': 'Magazine',
  'town_centre': 'Town Centre',
  'newton_estate': 'Newton/Estate',
  'distance': 'Distance',
};

const AttendanceReport = ({ service }) => {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [markingAbsent, setMarkingAbsent] = useState(false);
  const [unmarking, setUnmarking] = useState(false);
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

  const handleUnmarkAttendance = async () => {
    if (
      !window.confirm(
        'Are you sure? This will remove all attendance records (both present and absent) for this service.'
      )
    ) {
      return;
    }

    setUnmarking(true);
    setSuccessMessage('');
    try {
      const result = await attendanceApi.unmarkAttendance(service.id);
      setSuccessMessage(result.message);
      // Refresh attendance data
      setTimeout(() => {
        fetchAttendance();
        setSuccessMessage('');
      }, 2000);
    } catch (err) {
      setSuccessMessage('Error: Failed to unmark attendance');
    } finally {
      setUnmarking(false);
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

          {successMessage && (
            <div className="success-message">{successMessage}</div>
          )}

          {/* Main Statistics Section */}
          <div className="attendance-stats-section">
            <h4 className="section-title">📊 Attendance Statistics</h4>
            <div className="summary-stats">
              <div className="stat present">
                <h4>Total Present</h4>
                <p>{attendance.total_present}</p>
              </div>
              <div className="stat absent">
                <h4>Total Absent</h4>
                <p>{attendance.total_absent}</p>
              </div>
              <div className="stat male-present">
                <h4>👨 Males Present</h4>
                <p>{attendance.male_present || 0}</p>
              </div>
              <div className="stat female-present">
                <h4>👩 Females Present</h4>
                <p>{attendance.female_present || 0}</p>
              </div>
            </div>
          </div>

          {/* Class Breakdown Section */}
          {attendance.class_statistics && Object.keys(attendance.class_statistics).length > 0 && (
            <div className="class-breakdown-section">
              <h4 className="section-title">📋 Attendance by Class</h4>
              <div className="class-table-wrapper">
                <table className="class-statistics-table">
                  <thead>
                    <tr>
                      <th>Class Name</th>
                      <th className="text-center">Present</th>
                      <th className="text-center">Absent</th>
                      <th className="text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(attendance.class_statistics).map(([className, stats]) => (
                      <tr key={className}>
                        <td className="class-name">{CLASS_LABELS[className] || className}</td>
                        <td className="text-center present-count">{stats.present}</td>
                        <td className="text-center absent-count">{stats.absent}</td>
                        <td className="text-center total-count">{stats.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="attendance-actions">
            <button
              onClick={handleMarkAbsent}
              disabled={markingAbsent}
              className="btn btn-warning"
              title="Mark all unmarked members as absent"
            >
              {markingAbsent ? 'Marking...' : '✅ Mark Remaining as Absent'}
            </button>
            <button
              onClick={handleUnmarkAttendance}
              disabled={unmarking}
              className="btn btn-secondary"
              title="Remove all attendance records and start over"
            >
              {unmarking ? 'Unmarking...' : '↩️ Unmark Attendance'}
            </button>
          </div>


        </>
      )}
    </div>
  );
};

export default AttendanceReport;
