import React, { useState, useEffect } from 'react';
import { serviceApi } from '../services/api';
import { AttendanceScanner } from '../components';
import '../styles/pages.css';

const Scanner = () => {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkinCount, setCheckinCount] = useState(0);

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

  const handleCheckinSuccess = () => {
    setCheckinCount((prev) => prev + 1);
  };

  return (
    <div className="scanner-page">
      <div className="page-header">
        <h1>Attendance Scanner</h1>
      </div>

      {loading ? (
        <p>Loading services...</p>
      ) : (
        <div className="scanner-layout">
          <div className="service-selector">
            <h3>Select a Service</h3>
            <div className="service-list">
              {services.map((service) => (
                <button
                  key={service.id}
                  className={`service-button ${
                    selectedService?.id === service.id ? 'active' : ''
                  }`}
                  onClick={() => setSelectedService(service)}
                >
                  <div>
                    <strong>{service.name}</strong>
                    <p>{new Date(service.date).toLocaleDateString()}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="scanner-section">
            {selectedService && (
              <>
                <AttendanceScanner
                  service={selectedService}
                  onCheckinSuccess={handleCheckinSuccess}
                />
                <div className="checkin-counter">
                  <p>Total Check-ins: {checkinCount}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;
