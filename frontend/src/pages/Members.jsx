import React, { useState, useEffect } from 'react';
import { memberApi } from '../services/api';
import { useMemberStore } from '../context/store';
import { MembersTable, MemberFormModal } from '../components';
import '../styles/pages.css';

const Members = () => {
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    phone: '',
    email: '',
    place_of_residence: '',
    profession: '',
    department: '',
    class_name: '',
    committee: '',
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
      const data = await memberApi.getMembers();
      setMembers(data.results || data);
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
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      place_of_residence: formData.place_of_residence?.trim() || null,
      profession: formData.profession?.trim() || null,
      department: formData.department || null,
      class_name: formData.class_name || null,
      committee: formData.committee || null,
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
      phone: member.phone || '',
      email: member.email || '',
      place_of_residence: member.place_of_residence || '',
      profession: member.profession || '',
      department: member.department || '',
      class_name: member.class_name || '',
      committee: member.committee || '',
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
      phone: '',
      email: '',
      place_of_residence: '',
      profession: '',
      department: '',
      class_name: '',
      committee: '',
      is_visitor: false,
      baptised: false,
      confirmed: false,
    });
    setEditingId(null);
    setFormError(null);
    setShowFormModal(false);
  };

  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.full_name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.phone.toLowerCase().includes(query) ||
      member.department.toLowerCase().includes(query)
    );
  });

  return (
    <div className="members-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Church Members</h1>
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Search members by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        <button 
          className="btn btn-primary" 
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
        <p>Loading members...</p>
      ) : (
        <>
          {filteredMembers.length === 0 && searchQuery && (
            <div className="no-results">
              <p>No members found matching "{searchQuery}"</p>
            </div>
          )}
          <MembersTable
            members={filteredMembers}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
};

export default Members;
