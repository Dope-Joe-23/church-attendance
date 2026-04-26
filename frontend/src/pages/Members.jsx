import React, { useState, useEffect } from 'react';
import { memberApi } from '../services/api';
import apiClient from '../services/apiClient';
import { useMemberStore } from '../context/store';
import { MembersTable, MemberFormModal, LoadingSpinner } from '../components';
import '../styles/pages.css';

const Members = () => {
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisitorType, setFilterVisitorType] = useState('all'); // all, member, visitor
  const [filterClass, setFilterClass] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterCommittee, setFilterCommittee] = useState('all');
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    sex: '',
    phone: '',
    email: '',
    place_of_residence: '',
    profession: '',
    department: '',
    class_name: '',
    committee: '',
    marital_status: '',
    is_visitor: false,
    baptised: false,
    confirmed: false,
  });
  const { members, setMembers, isLoading, setIsLoading } = useMemberStore();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      // memberApi.getMembers() already handles pagination and returns all members
      const data = await memberApi.getMembers();
      const membersList = data.results || data;
      setMembers(membersList);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setFormError('Full name is required');
      return;
    }
    
    // Validate that non-visitors have at least one contact method
    if (!formData.is_visitor && !formData.email.trim() && !formData.phone.trim()) {
      setFormError('Non-visitor members must have at least one contact method (email or phone)');
      return;
    }

    // Clean form data - convert empty strings to null for optional fields
    const cleanedData = {
      full_name: formData.full_name.trim(),
      date_of_birth: formData.date_of_birth || null,
      sex: formData.sex || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      place_of_residence: formData.place_of_residence?.trim() || null,
      profession: formData.profession?.trim() || null,
      department: formData.department || null,
      class_name: formData.class_name || null,
      committee: formData.committee || null,
      marital_status: formData.marital_status || null,
      is_visitor: formData.is_visitor,
      baptised: formData.baptised,
      confirmed: formData.confirmed,
    };

    try {
      if (editingId) {
        await memberApi.updateMember(editingId, cleanedData);
      } else {
        await memberApi.createMember(cleanedData);
      }
      fetchMembers();
      resetForm();
    } catch (error) {
      console.error('Error saving member:', error);
      
      // Handle various error response formats
      const errorData = error.response?.data;
      let errorMsg = 'Failed to save member';
      
      if (typeof errorData === 'string') {
        errorMsg = errorData;
      } else if (errorData?.detail) {
        errorMsg = errorData.detail;
      } else if (errorData?.non_field_errors) {
        errorMsg = Array.isArray(errorData.non_field_errors) 
          ? errorData.non_field_errors[0] 
          : errorData.non_field_errors;
      } else if (typeof errorData === 'object') {
        // Get the first field error
        for (const [field, messages] of Object.entries(errorData)) {
          if (Array.isArray(messages)) {
            errorMsg = messages[0];
          } else if (typeof messages === 'string') {
            errorMsg = messages;
          }
          break;
        }
      }
      
      setFormError(errorMsg);
    }
  };

  const handleEdit = (member) => {
    setFormData({
      full_name: member.full_name,
      date_of_birth: member.date_of_birth || '',
      sex: member.sex || '',
      phone: member.phone || '',
      email: member.email || '',
      place_of_residence: member.place_of_residence || '',
      profession: member.profession || '',
      department: member.department || '',
      class_name: member.class_name || '',
      committee: member.committee || '',
      marital_status: member.marital_status || '',
      is_visitor: member.is_visitor || false,
      baptised: member.baptised || false,
      confirmed: member.confirmed || false,
    });
    setEditingId(member.id);
    setFormError(null);
    setShowFormModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this member?')) {
      try {
        await memberApi.deleteMember(id);
        fetchMembers();
      } catch (error) {
        console.error('Error deleting member:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      date_of_birth: '',
      sex: '',
      phone: '',
      email: '',
      place_of_residence: '',
      profession: '',
      department: '',
      class_name: '',
      committee: '',
      marital_status: '',
      is_visitor: false,
      baptised: false,
      confirmed: false,
    });
    setEditingId(null);
    setFormError(null);
    setShowFormModal(false);
  };

  const filteredMembers = members.filter((member) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = (
        (member.full_name && member.full_name.toLowerCase().includes(query)) ||
        (member.email && member.email.toLowerCase().includes(query)) ||
        (member.phone && member.phone.toLowerCase().includes(query)) ||
        (member.member_id && member.member_id.toLowerCase().includes(query))
      );
      if (!matchesSearch) return false;
    }

    // Visitor/Member filter
    if (filterVisitorType !== 'all') {
      if (filterVisitorType === 'member' && member.is_visitor) return false;
      if (filterVisitorType === 'visitor' && !member.is_visitor) return false;
    }

    // Class filter
    if (filterClass !== 'all' && member.class_name !== filterClass) {
      return false;
    }

    // Department filter
    if (filterDepartment !== 'all' && member.department !== filterDepartment) {
      return false;
    }

    // Committee filter
    if (filterCommittee !== 'all' && member.committee !== filterCommittee) {
      return false;
    }

    return true;
  });

  // Debug logging
  React.useEffect(() => {
    if (members.length > 0) {
      console.log(`📊 Total members: ${members.length}, Search query: "${searchQuery}", Filtered: ${filteredMembers.length}`);
    }
  }, [searchQuery, filteredMembers.length]);

  // Get unique filter values
  const getUniqueClasses = () => {
    const classes = new Set(members.map(m => m.class_name).filter(Boolean));
    return Array.from(classes).sort();
  };

  const getUniqueDepartments = () => {
    const departments = new Set(members.map(m => m.department).filter(Boolean));
    return Array.from(departments).sort();
  };

  const getUniqueCommittees = () => {
    const committees = new Set(members.map(m => m.committee).filter(Boolean));
    return Array.from(committees).sort();
  };

  return (
    <div className="members-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Church Members</h1>
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="search-action-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search by name, email, phone or member ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <button 
          className="btn btn-primary add-member-btn" 
          onClick={() => {
            setEditingId(null);
            setFormError(null);
            setFormData({
              full_name: '',
              phone: '',
              email: '',
              department: '',
              group: '',
              location: '',
              is_visitor: false,
              baptised: false,
              confirmed: false,
            });
            setShowFormModal(true);
          }}
        >
          + Add New Member
        </button>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filter-group">
          <label htmlFor="filter-type">Type:</label>
          <select
            id="filter-type"
            value={filterVisitorType}
            onChange={(e) => setFilterVisitorType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Members</option>
            <option value="member">Members Only</option>
            <option value="visitor">Visitors Only</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-class">Class:</label>
          <select
            id="filter-class"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Classes</option>
            {getUniqueClasses().map(cls => (
              <option key={cls} value={cls}>{cls || 'N/A'}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-dept">Department:</label>
          <select
            id="filter-dept"
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Departments</option>
            {getUniqueDepartments().map(dept => (
              <option key={dept} value={dept}>{dept || 'N/A'}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-committee">Committee:</label>
          <select
            id="filter-committee"
            value={filterCommittee}
            onChange={(e) => setFilterCommittee(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Committees</option>
            {getUniqueCommittees().map(comm => (
              <option key={comm} value={comm}>{comm || 'N/A'}</option>
            ))}
          </select>
        </div>
      </div>

      <MemberFormModal
        isOpen={showFormModal}
        isEditing={!!editingId}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmit}
        onClose={resetForm}
        error={formError}
      />

      {isLoading ? (
        <LoadingSpinner message="Loading members..." />
      ) : (
        <>
          {filteredMembers.length === 0 && (searchQuery || filterVisitorType !== 'all' || filterClass !== 'all' || filterDepartment !== 'all' || filterCommittee !== 'all') && (
            <div className="no-results">
              <p>No members match your search or filter criteria.</p>
            </div>
          )}
          {filteredMembers.length === 0 && !searchQuery && filterVisitorType === 'all' && filterClass === 'all' && filterDepartment === 'all' && filterCommittee === 'all' && (
            <div className="no-results">
              <p>No members found. Add a new member to get started.</p>
            </div>
          )}
          <div className="members-table-wrapper">
            <MembersTable
              members={filteredMembers}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Members;
