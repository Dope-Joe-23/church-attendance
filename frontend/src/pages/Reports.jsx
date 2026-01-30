import React, { useState, useEffect } from 'react';
import { serviceApi } from '../services/api';
import { AttendanceReport, ServiceCard } from '../components';
import '../styles/pages.css';

const Reports = () => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const data = await serviceApi.getServices();
      const servicesList = data.results || data;
      setServices(servicesList);
      if (servicesList.length > 0) {
        setSelectedService(servicesList[0]);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>Attendance Reports</h1>
      </div>

      {loading ? (
        <p>Loading services...</p>
      ) : (
        <div className="reports-layout">
          <div className="services-sidebar">
            <h3>Select a Service</h3>
            <div className="service-list">
              {services.map((service) => (
                <div
                  key={service.id}
                  className={`service-item ${
                    selectedService?.id === service.id ? 'active' : ''
                  }`}
                  onClick={() => setSelectedService(service)}
                >
                  <strong>{service.name}</strong>
                  <p>{new Date(service.date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="reports-content">
            {selectedService && (
              <AttendanceReport service={selectedService} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
