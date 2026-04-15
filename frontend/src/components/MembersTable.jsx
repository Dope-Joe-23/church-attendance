import React, { useState } from 'react';
import QRCodeModal from './QRCodeModal';
import '../styles/components.css';

const MembersTable = ({ members, onEdit, onDelete }) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const getDepartmentLabel = (value) => {
    const departments = {
      'technical': 'Technical',
      'media': 'Media',
      'echoes_of_grace': 'Echoes of Grace',
      'celestial_harmony_choir': 'Celestial Harmony Choir',
      'heavenly_vibes': 'Heavenly Vibes',
      'prayer_evangelism': 'Prayer and Evangelism',
      'visitor_care': 'Visitor Care',
      'protocol_ushering': 'Protocol & Ushering',
    };
    return departments[value] || value || '-';
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
    return classes[value] || value || '-';
  };

  const getMaritalStatusLabel = (value) => {
    const statuses = {
      'single': 'Single',
      'married': 'Married',
    };
    return statuses[value] || value || '-';
  };

  const handleQRClick = (member) => {
    setSelectedMember(member);
    setShowQRModal(true);
  };

  return (
    <>
      <div className="table-container">
        <table className="members-table">
          <thead>
            <tr>
              <th>Member ID</th>
              <th>Full Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Department</th>
              <th>Class</th>
              <th>Marital Status</th>
              <th>Visitor</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="member-row">
                <td className="member-id-col" data-label="Member ID">
                  <span className="badge-id">{member.member_id}</span>
                </td>
                <td className="member-name-col" data-label="Full Name">{member.full_name}</td>
                <td className="phone-col" data-label="Phone">{member.phone || '-'}</td>
                <td className="email-col" data-label="Email">{member.email || '-'}</td>
                <td className="department-col" data-label="Department">{getDepartmentLabel(member.department)}</td>
                <td className="class-col" data-label="Class">{getClassLabel(member.class_name)}</td>
                <td className="marital-status-col" data-label="Marital Status">{getMaritalStatusLabel(member.marital_status)}</td>
                <td className="visitor-col" data-label="Visitor">
                  {member.is_visitor ? (
                    <span className="visitor-badge-small">Visitor</span>
                  ) : (
                    <span className="member-badge-small">Member</span>
                  )}
                </td>
                <td className="actions-col" data-label="Actions">
                  <div className="action-buttons">
                    {member.qr_code_image && (
                      <button
                        className="btn-icon qr-icon"
                        onClick={() => handleQRClick(member)}
                        title="View QR Code"
                      >
                        📱
                      </button>
                    )}
                    <button
                      className="btn-icon edit-icon"
                      onClick={() => onEdit(member)}
                      title="Edit Member"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon delete-icon"
                      onClick={() => onDelete(member.id)}
                      title="Delete Member"
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

      {members.length === 0 && (
        <div className="no-members-message">
          <p>No members found. Add a new member to get started.</p>
        </div>
      )}

      <QRCodeModal
        isOpen={showQRModal}
        member={selectedMember}
        onClose={() => setShowQRModal(false)}
      />
    </>
  );
};

export default MembersTable;
