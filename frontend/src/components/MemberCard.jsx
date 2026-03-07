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

  const getClassLabel = (value) => {
    const classes = {
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
    return classes[value] || value;
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
            {member.class_name && (
              <div className="info-row">
                <span className="info-label">Class:</span>
                <span className="info-value">{getClassLabel(member.class_name)}</span>
              </div>
            )}
          </div>
        </div>
      <div className="card-footer">
        {onEdit && (
          <button className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors hover:shadow-sm" onClick={() => onEdit(member)}>
            Edit
          </button>
        )}
        {onDelete && (
          <button className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors hover:shadow-sm" onClick={() => onDelete(member.id)}>
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
