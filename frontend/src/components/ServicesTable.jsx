import React, { useState } from 'react';
import { serviceApi } from '../services/api';
import '../styles/components.css';

const ServicesTable = ({ services, onEdit, onDelete, onSelect, onServiceClosed }) => {
  const [closingServiceId, setClosingServiceId] = useState(null);
  
  // Filter to only show parent services (not session instances)
  const parentServices = services.filter(s => !s.parent_service);
  
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleCloseService = async (service) => {
    if (!confirm(`Close "${service.name}" and mark absent members?`)) {
      return;
    }

    setClosingServiceId(service.id);
    try {
      const result = await serviceApi.closeService(service.id);
      alert(`Success: ${result.message}`);
      if (onServiceClosed) {
        onServiceClosed(service.id);
      }
    } catch (error) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setClosingServiceId(null);
    }
  };

  return (
    <>
      <div className="table-container">
        <table className="services-table">
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Date</th>
              <th>Time</th>
              <th>Location</th>
              <th>Recurring</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {parentServices.map((service) => (
              <tr key={service.id} className="service-row">
                <td className="service-name-col" data-label="Service Name">
                  <span className="badge-name">{service.name}</span>
                </td>
                <td className="service-date-col" data-label="Date">
                  {formatDate(service.date)}
                </td>
                <td className="service-time-col" data-label="Time">
                  {formatTime(service.start_time)}
                </td>
                <td className="service-location-col" data-label="Location">
                  {service.location || '-'}
                </td>
                <td className="service-recurring-col" data-label="Recurring">
                  {service.is_recurring ? (
                    <span className="badge-recurring">
                      {service.recurrence_pattern?.charAt(0).toUpperCase() + service.recurrence_pattern?.slice(1)}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="service-description-col" data-label="Description">
                  {service.description ? (
                    <span className="description-text">
                      {service.description.length > 40
                        ? `${service.description.substring(0, 40)}...`
                        : service.description}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="actions-col" data-label="Actions">
                  <div className="action-buttons">
                    {onSelect && (
                      <button
                        className="btn-icon attendance-icon"
                        onClick={() => onSelect(service)}
                        title="Take Attendance"
                      >
                        📋
                      </button>
                    )}
                    {service.end_time && (
                      <button
                        className="btn-icon close-icon"
                        onClick={() => handleCloseService(service)}
                        disabled={closingServiceId === service.id}
                        title="Close Service & Mark Absent"
                      >
                        🔒
                      </button>
                    )}
                    <button
                      className="btn-icon edit-icon"
                      onClick={() => onEdit(service)}
                      title="Edit Service"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon delete-icon"
                      onClick={() => onDelete(service.id)}
                      title="Delete Service"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {parentServices.length === 0 && (
        <div className="no-services-message">
          <p>No services found. Add a new service to get started.</p>
        </div>
      )}
    </>
  );
};

export default ServicesTable;
