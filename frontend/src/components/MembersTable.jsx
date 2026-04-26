import React, { useState } from 'react';
import QRCodeModal from './QRCodeModal';
import MemberDetailsModal from './MemberDetailsModal';
import '../styles/components.css';

const MembersTable = ({ members, onEdit, onDelete }) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const handleQRClick = (member) => {
    setSelectedMember(member);
    setShowQRModal(true);
  };

  const handleViewDetails = (member) => {
    setSelectedMember(member);
    setShowDetailsModal(true);
  };

  return (
    <>
      <div className="table-container">
        <table className="members-table">
          <thead>
            <tr>
              <th>Member ID</th>
              <th>Full Name</th>
              <th>Sex</th>
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
                <td className="sex-col" data-label="Sex">
                  {member.sex ? (member.sex === 'male' ? '👨 Male' : '👩 Female') : '—'}
                </td>
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
                      className="btn-icon details-icon"
                      onClick={() => handleViewDetails(member)}
                      title="View Participation & Details"
                    >
                      👁️
                    </button>
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

      <MemberDetailsModal
        isOpen={showDetailsModal}
        member={selectedMember}
        onClose={() => setShowDetailsModal(false)}
      />
    </>
  );
};

export default MembersTable;
