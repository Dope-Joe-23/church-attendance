import React, { useState, useEffect } from 'react';
import { memberApi } from '../services/api';
import { useMemberStore } from '../context/store';
import { MembersTable, MemberFormModal } from '../components';
import '../styles/pages.css';

const Members = () => {
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    department: '',
    group: '',
    is_visitor: false,
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
    try {
      if (editingId) {
        await memberApi.updateMember(editingId, formData);
      } else {
        await memberApi.createMember(formData);
      }
      fetchMembers();
      resetForm();
    } catch (error) {
      console.error('Error saving member:', error);
      const errorMsg = error.response?.data?.full_name?.[0] || error.response?.data?.detail || 'Failed to save member';
      setFormError(errorMsg);
    }
  };

  const handleEdit = (member) => {
    setFormData({
      full_name: member.full_name,
      phone: member.phone || '',
      email: member.email || '',
      department: member.department || '',
      group: member.group || '',
      is_visitor: member.is_visitor || false,
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
      phone: '',
      email: '',
      department: '',
      group: '',
      is_visitor: false,
    });
    setEditingId(null);
    setFormError(null);
    setShowFormModal(false);
  };

  return (
    <div className="members-page">
      <div className="page-header">
        <h1>Church Members</h1>
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
              is_visitor: false,
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
        <MembersTable
          members={members}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default Members;
