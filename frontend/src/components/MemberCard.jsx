import React, { useState } from 'react';
import QRCodeModal from './QRCodeModal';
import '../styles/components.css';

const MemberCard = ({ member, onEdit, onDelete }) => {
  const [showQRModal, setShowQRModal] = useState(false);

  // Helper function to get label from value
  const getDepartmentLabel = (value) => {
    const departments = {
      'worship': 'Worship',
      'outreach': 'Outreach',
      'youth': 'Youth',
      'administration': 'Administration',
    };
    return departments[value] || value;
  };

  const getGroupLabel = (value) => {
    const groups = {
      'group_a': 'Group A',
      'group_b': 'Group B',
      'group_c': 'Group C',
      'group_d': 'Group D',
    };
    return groups[value] || value;
  };

  return (
    <>
      <div className="card member-card">
        <div className="card-header">
          <div className="header-content">
            <h3>{member.full_name}</h3>
            <span className="member-id">ID: {member.member_id}</span>
            {member.is_visitor && <span className="visitor-badge">Visitor</span>}
          </div>
          {member.qr_code_image && (
            <button
              className="qr-view-btn"
              onClick={() => setShowQRModal(true)}
              title="View and download QR code"
            >
              📱 QR
            </button>
          )}
        </div>
        <div className="card-body">
          <div className="member-info-list">
            {member.phone && (
              <div className="info-row">
                <span className="info-label">Phone:</span>
                <span className="info-value">{member.phone}</span>
              </div>
            )}
            {member.email && (
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">{member.email}</span>
              </div>
            )}
            {member.department && (
              <div className="info-row">
                <span className="info-label">Department:</span>
                <span className="info-value">{getDepartmentLabel(member.department)}</span>
              </div>
            )}
            {member.group && (
              <div className="info-row">
                <span className="info-label">Group:</span>
                <span className="info-value">{getGroupLabel(member.group)}</span>
              </div>
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
    <QRCodeModal
      isOpen={showQRModal}
      member={member}
      onClose={() => setShowQRModal(false)}
    />
    </>
  );
};

export default MemberCard;
