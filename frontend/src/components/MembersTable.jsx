import React, { useState } from 'react';
import QRCodeModal from './QRCodeModal';
import '../styles/components.css';

const MembersTable = ({ members, onEdit, onDelete }) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const getDepartmentLabel = (value) => {
    const departments = {
      'worship': 'Worship',
      'outreach': 'Outreach',
      'youth': 'Youth',
      'administration': 'Administration',
    };
    return departments[value] || value || '-';
  };

  const getGroupLabel = (value) => {
    const groups = {
      'group_a': 'Group A',
      'group_b': 'Group B',
      'group_c': 'Group C',
      'group_d': 'Group D',
    };
    return groups[value] || value || '-';
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
              <th>Group</th>
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
                <td className="group-col" data-label="Group">{getGroupLabel(member.group)}</td>
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
