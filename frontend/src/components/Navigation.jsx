import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../services/apiClient';
import '../styles/components.css';

const Navigation = ({ user, onLogout }) => {
  const location = useLocation();
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isActive = (path) => {
    return location.pathname === path;
  };

  useEffect(() => {
    fetchUnresolvedAlerts();
    // Refresh alerts every 30 seconds
    const interval = setInterval(fetchUnresolvedAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnresolvedAlerts = async () => {
    try {
      const response = await apiClient.get('/members/alerts/unresolved/');
      setAlertCount(response.data.length);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <div className="logo-wrapper">
            <span className="logo-icon">⛪</span>
            <h1 className="logo-text">Church-In</h1>
          </div>
        </div>
        <ul className="nav-menu">
          <li className="nav-item">
            <a href="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
              Home
            </a>
          </li>
          <li className="nav-item">
            <a href="/members" className={`nav-link ${isActive('/members') ? 'active' : ''}`}>
              Members
            </a>
          </li>
          <li className="nav-item">
            <a href="/services" className={`nav-link ${isActive('/services') ? 'active' : ''}`}>
              Services
            </a>
          </li>
          <li className="nav-item">
            <a href="/scanner" className={`nav-link ${isActive('/scanner') ? 'active' : ''}`}>
              Scanner
            </a>
          </li>
          <li className="nav-item">
            <a href="/reports" className={`nav-link ${isActive('/reports') ? 'active' : ''}`}>
              Reports
            </a>
          </li>
          <li className="nav-item notification-item">
            <a href="/care" className={`nav-link notification-link ${isActive('/care') ? 'active' : ''}`}>
              <span className="notification-icon">🔔</span>
              {alertCount > 0 && (
                <span className="alert-badge">{alertCount > 99 ? '99+' : alertCount}</span>
              )}
            </a>
          </li>
        </ul>
        <div className="navbar-right">
          {user && <span className="user-name">Welcome, {user.name}</span>}
          {onLogout && (
            <button className="btn btn-secondary" onClick={onLogout}>
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
