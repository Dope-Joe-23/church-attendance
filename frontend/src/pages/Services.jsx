import React, { useState, useEffect } from 'react';
import { serviceApi } from '../services/api';
import { useServiceStore } from '../context/store';
import { ServicesTable, ServiceFormModal, SessionsModal, AttendanceScanner } from '../components';
import '../styles/pages.css';

const Services = () => {
  const [showFormModal, setShowFormModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [showAttendanceScanner, setShowAttendanceScanner] = useState(false);
  const [selectedServiceForSessions, setSelectedServiceForSessions] = useState(null);
  const [selectedSessionForAttendance, setSelectedSessionForAttendance] = useState(null);
  const [sessionsList, setSessionsList] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [addDateError, setAddDateError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
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
      // Prepare data based on recurring status
      const submitData = { ...formData };
      
      if (submitData.is_recurring) {
        // For recurring services, set recurrence_pattern and clear date
        if (!submitData.recurrence_pattern) {
          setFormError('Recurrence Pattern is required for recurring services');
          return;
        }
        submitData.date = null; // Recurring services don't have a specific date
      } else {
        // For non-recurring services, ensure date and time are set
        if (!submitData.date || !submitData.start_time) {
          setFormError('Date and Start Time are required for one-time services');
          return;
        }
        submitData.recurrence_pattern = 'none'; // Set to default for non-recurring
      }
      
      if (editingId) {
        await serviceApi.updateService(editingId, submitData);
      } else {
        await serviceApi.createService(submitData);
      }
      fetchServices();
      resetForm();
    } catch (error) {
      console.error('Error saving service:', error);
      const errorMsg = error.response?.data?.name?.[0] || error.response?.data?.detail || error.response?.data || 'Failed to save service';
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

  const handleViewSessions = async (service) => {
    // For recurring parent services, fetch all instances and show sessions modal
    if (service.is_recurring && !service.parent_service) {
      setSelectedServiceForSessions(service);
      setSessionsLoading(true);
      try {
        // Filter instances from the services list where parent_service matches this service
        const instances = services.filter(
          (s) => s.parent_service === service.id
        );
        setSessionsList(instances);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setSessionsLoading(false);
      }
      setShowSessionsModal(true);
    } else {
      // For one-off services, directly open attendance scanner
      setSelectedSessionForAttendance(service);
      setShowAttendanceScanner(true);
    }
  };

  const handleSelectSession = (session) => {
    // Close SessionsModal and set up AttendanceScanner for the selected session
    setShowSessionsModal(false);
    setSelectedSessionForAttendance(session);
    setShowAttendanceScanner(true);
  };

  const handleAddDateSubmit = async (serviceId, dateString, location = '', startTime = '', endTime = '') => {
    try {
      setAddDateError(null);
      const response = await serviceApi.addServiceInstance(serviceId, dateString, location, startTime, endTime);
      
      // Get the newly created instance from the response
      if (response && response.instance) {
        // Add the new instance directly to the state
        setSessionsList((prevSessions) => [...prevSessions, response.instance]);
      }
    } catch (error) {
      console.error('Error adding service date:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to add date';
      setAddDateError(errorMsg);
    }
  };

  const handleSessionAdded = async (serviceId) => {
    // Refresh services to update parent service counts
    await fetchServices();
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

  const filteredServices = services.filter((service) => {
    const query = searchQuery.toLowerCase();
    return (
      service.name.toLowerCase().includes(query) ||
      (service.location && service.location.toLowerCase().includes(query)) ||
      (service.description && service.description.toLowerCase().includes(query))
    );
  });

  return (
    <div className="services-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Church Services</h1>
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Search services by name, location..."
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
      />

      <SessionsModal
        isOpen={showSessionsModal}
        service={selectedServiceForSessions}
        sessions={sessionsList}
        onSelectSession={handleSelectSession}
        onClose={() => setShowSessionsModal(false)}
        isLoading={sessionsLoading}
        onAddDate={handleAddDateSubmit}
        addDateError={addDateError}
        onSessionAdded={handleSessionAdded}
      />

      {showAttendanceScanner && selectedSessionForAttendance && (
        <AttendanceScanner
          service={selectedSessionForAttendance}
          onCheckinSuccess={() => {
            setShowAttendanceScanner(false);
            setSelectedSessionForAttendance(null);
          }}
        />
      )}

      {isLoading ? (
        <p>Loading services...</p>
      ) : (
        <>
          {filteredServices.length === 0 && searchQuery && (
            <div className="no-results">
              <p>No services found matching "{searchQuery}"</p>
            </div>
          )}
          <ServicesTable
            services={filteredServices}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSelect={handleViewSessions}
          />
        </>
      )}
    </div>
  );
};

export default Services;

