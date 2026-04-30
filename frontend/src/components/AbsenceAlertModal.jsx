import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import MemberDetailsModal from './MemberDetailsModal';
import '../styles/components.css';

const AbsenceAlertModal = ({ isOpen, onClose, membersData = [] }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [sortBy, setSortBy] = useState('consecutive'); // 'consecutive', 'name'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && membersData.length === 0) {
      fetchMembers();
    } else if (isOpen && membersData.length > 0) {
      setMembers(membersData);
    }
  }, [isOpen]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/members/with_ten_absences/');
      setMembers(response.data.members || []);
    } catch (error) {
      console.error('Error fetching members with absences:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (member) => {
    setSelectedMember(member);
    setShowDetailsModal(true);
  };

  const sortedAndFilteredMembers = () => {
    let filtered = members.filter(m =>
      m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.member_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortBy === 'consecutive') {
      filtered.sort((a, b) => b.consecutive_absences - a.consecutive_absences);
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }

    return filtered;
  };

  if (!isOpen) return null;

  const displayMembers = sortedAndFilteredMembers();

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content absence-alert-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <h2 className="modal-title">
              <span className="alert-icon">⚠️</span>
              Members with 10+ Consecutive Absences
            </h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>

          {/* Search and Sort Bar */}
          <div className="alert-controls">
            <div className="search-box-small">
              <input
                type="text"
                placeholder="🔍 Search by name or member ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input-small"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="consecutive">Sort by Absences (Highest)</option>
              <option value="name">Sort by Name (A-Z)</option>
            </select>
          </div>

          {/* Content */}
          <div className="modal-body absence-alert-body">
            {loading ? (
              <div className="loading-state">
                <span className="spinner"></span>
                <p>Loading members...</p>
              </div>
            ) : displayMembers.length === 0 ? (
              <div className="empty-state">
                <p className="empty-message">
                  {members.length === 0
                    ? '✨ No members with 10+ consecutive absences'
                    : 'No members match your search'}
                </p>
              </div>
            ) : (
              <div className="members-list">
                {displayMembers.map((member) => (
                  <div key={member.id} className="alert-member-card">
                    <div className="member-info">
                      <div className="member-header">
                        <h3 className="member-name">{member.full_name}</h3>
                        <span className="member-id">{member.member_id}</span>
                      </div>
                      <div className="member-details-row">
                        <span className="detail-label">Consecutive Absences:</span>
                        <span className="detail-value absence-count">
                          {member.consecutive_absences}
                        </span>
                      </div>
                      {member.phone && (
                        <div className="member-details-row">
                          <span className="detail-label">Phone:</span>
                          <span className="detail-value">{member.phone}</span>
                        </div>
                      )}
                      {member.email && (
                        <div className="member-details-row">
                          <span className="detail-label">Email:</span>
                          <span className="detail-value email-text">{member.email}</span>
                        </div>
                      )}
                      {member.last_attendance_date && (
                        <div className="member-details-row">
                          <span className="detail-label">Last Attendance:</span>
                          <span className="detail-value">
                            {new Date(member.last_attendance_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div className="member-details-row">
                        <span className="detail-label">Status:</span>
                        <span className={`status-badge status-${member.attendance_status}`}>
                          {member.attendance_status === 'critical'
                            ? '🔴 Critical'
                            : member.attendance_status === 'at_risk'
                            ? '🟠 At Risk'
                            : '🟡 Inactive'}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn btn-view-details"
                      onClick={() => handleViewDetails(member)}
                      title="View full member details and participation history"
                    >
                      View Details →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <p className="info-text">
              Total: <strong>{displayMembers.length}</strong> members with 10+ consecutive absences
            </p>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Member Details Modal */}
      <MemberDetailsModal
        isOpen={showDetailsModal}
        member={selectedMember}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedMember(null);
        }}
      />
    </>
  );
};

export default AbsenceAlertModal;
