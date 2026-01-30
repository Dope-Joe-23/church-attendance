import React from 'react';
import '../styles/components.css';

const ServiceCard = ({ service, onEdit, onDelete, onSelect }) => {
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
    });
  };

  return (
    <div className="card service-card">
      <div className="card-header">
        <h3>{service.name}</h3>
        <span className="service-date">{formatDate(service.date)}</span>
      </div>
      <div className="card-body">
        <div className="service-info">
          <p>
            <strong>Time:</strong> {formatTime(service.start_time)}
          </p>
          {service.location && (
            <p>
              <strong>Location:</strong> {service.location}
            </p>
          )}
          {service.description && (
            <p>
              <strong>Description:</strong> {service.description}
            </p>
          )}
        </div>
      </div>
      <div className="card-footer">
        {onSelect && (
          <button className="btn btn-success" onClick={() => onSelect(service)}>
            Take Attendance
          </button>
        )}
        {onEdit && (
          <button className="btn btn-primary" onClick={() => onEdit(service)}>
            Edit
          </button>
        )}
        {onDelete && (
          <button className="btn btn-danger" onClick={() => onDelete(service.id)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default ServiceCard;
