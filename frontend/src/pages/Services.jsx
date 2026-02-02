import React, { useState, useEffect } from 'react';
import { serviceApi } from '../services/api';
import { useServiceStore } from '../context/store';
import { ServicesTable, ServiceFormModal, AddServiceDateModal } from '../components';
import '../styles/pages.css';

const Services = () => {
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAddDateModal, setShowAddDateModal] = useState(false);
  const [selectedServiceForDate, setSelectedServiceForDate] = useState(null);
  const [addDateError, setAddDateError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
    is_recurring: false,
    recurrence_pattern: '',
  });
  const { services, setServices, isLoading, setIsLoading } = useServiceStore();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const data = await serviceApi.getServices();
      setServices(data.results || data);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await serviceApi.updateService(editingId, formData);
      } else {
        await serviceApi.createService(formData);
      }
      fetchServices();
      resetForm();
    } catch (error) {
      console.error('Error saving service:', error);
      const errorMsg = error.response?.data?.name?.[0] || error.response?.data?.detail || 'Failed to save service';
      setFormError(errorMsg);
    }
  };

  const handleEdit = (service) => {
    setFormData({
      name: service.name,
      date: service.date,
      start_time: service.start_time,
      end_time: service.end_time || '',
      location: service.location || '',
      description: service.description || '',
      is_recurring: service.is_recurring || false,
      recurrence_pattern: service.recurrence_pattern || '',
    });
    setEditingId(service.id);
    setFormError(null);
    setShowFormModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this service?')) {
      try {
        await serviceApi.deleteService(id);
        fetchServices();
      } catch (error) {
        console.error('Error deleting service:', error);
      }
    }
  };

  const handleAddDate = (service) => {
    setSelectedServiceForDate(service);
    setAddDateError(null);
    setShowAddDateModal(true);
  };

  const handleAddDateSubmit = async (serviceId, dateString) => {
    try {
      setAddDateError(null);
      await serviceApi.addServiceInstance(serviceId, dateString);
      fetchServices();
      setShowAddDateModal(false);
      setSelectedServiceForDate(null);
    } catch (error) {
      console.error('Error adding service date:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to add date';
      setAddDateError(errorMsg);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      date: '',
      start_time: '',
      end_time: '',
      location: '',
      description: '',
      is_recurring: false,
      recurrence_pattern: '',
    });
    setEditingId(null);
    setFormError(null);
    setShowFormModal(false);
  };

  return (
    <div className="services-page">
      <div className="page-header">
        <h1>Church Services</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            setEditingId(null);
            setFormError(null);
            setFormData({
              name: '',
              date: '',
              start_time: '',
              end_time: '',
              location: '',
              description: '',
              is_recurring: false,
              recurrence_pattern: '',
            });
            setShowFormModal(true);
          }}
        >
          + Add New Service
        </button>
      </div>

      <ServiceFormModal
        isOpen={showFormModal}
        isEditing={!!editingId}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmit}
        onClose={resetForm}
        error={formError}
        onAddDate={handleAddDate}
      />

      <AddServiceDateModal
        isOpen={showAddDateModal}
        service={selectedServiceForDate}
        onSubmit={handleAddDateSubmit}
        onClose={() => setShowAddDateModal(false)}
        error={addDateError}
      />

      {isLoading ? (
        <p>Loading services...</p>
      ) : (
        <ServicesTable
          services={services}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSelect={handleEdit}
        />
      )}
    </div>
  );
};

export default Services;

