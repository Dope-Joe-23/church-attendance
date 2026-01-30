import React from 'react';
import '../styles/components.css';

const MemberCard = ({ member, onEdit, onDelete }) => {
  return (
    <div className="card member-card">
      <div className="card-header">
        <h3>{member.full_name}</h3>
        <span className="member-id">ID: {member.member_id}</span>
      </div>
      <div className="card-body">
        {member.qr_code_image && (
          <div className="qr-code-container">
            <img
              src={member.qr_code_image}
              alt={`QR code for ${member.member_id}`}
              className="qr-code"
            />
          </div>
        )}
        <div className="member-info">
          {member.phone && (
            <p>
              <strong>Phone:</strong> {member.phone}
            </p>
          )}
          {member.email && (
            <p>
              <strong>Email:</strong> {member.email}
            </p>
          )}
          {member.department && (
            <p>
              <strong>Department:</strong> {member.department}
            </p>
          )}
        </div>
      </div>
      <div className="card-footer">
        {onEdit && (
          <button className="btn btn-primary" onClick={() => onEdit(member)}>
            Edit
          </button>
        )}
        {onDelete && (
          <button className="btn btn-danger" onClick={() => onDelete(member.id)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default MemberCard;
