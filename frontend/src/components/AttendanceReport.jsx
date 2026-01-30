import React, { useState, useEffect } from 'react';
import { attendanceApi } from '../services/api';
import '../styles/components.css';

const AttendanceReport = ({ service }) => {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (service) {
      fetchAttendance();
    }
  }, [service]);

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

          <div className="attendance-table">
            <table>
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Member ID</th>
                  <th>Status</th>
                  <th>Check-in Time</th>
                </tr>
              </thead>
              <tbody>
                {attendance.attendances.map((record) => (
                  <tr key={record.id}>
                    <td>{record.member_details.full_name}</td>
                    <td>{record.member_details.member_id}</td>
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
