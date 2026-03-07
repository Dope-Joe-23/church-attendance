import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import authService from '../services/authService';
import '../styles/components.css';

const Navigation = ({ isAuthenticated, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isActive = (path) => {
    return location.pathname === path;
  };

  useEffect(() => {
    // Only fetch alerts if authenticated
    if (isAuthenticated) {
      fetchUnresolvedAlerts();
    } else {
      setLoading(false);
    }
    return undefined;
  }, [isAuthenticated]);

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

  const handleLogout = () => {
    authService.logout();
    // Call the onLogout callback immediately
    if (onLogout) {
      onLogout();
    }
    navigate('/login');
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
          {isAuthenticated ? (
            <>
              <li className="nav-item">
                <a href="/dashboard" className={`nav-link ${isActive('/dashboard') || isActive('/') ? 'active' : ''}`}>
                  Dashboard
                </a>
              </li>
              <li className="nav-item">
                <a href="/scanner" className={`nav-link ${isActive('/scanner') ? 'active' : ''}`}>
                  Check-in
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
            </>
          ) : (
            <>
              <li className="nav-item">
                <a href="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                  Home
                </a>
              </li>
            </>
          )}
        </ul>
        <div className="navbar-right">
          {isAuthenticated ? (
            <button className="btn btn-secondary logout-btn" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <a href="/login" className="btn btn-primary login-btn">
              Login
            </a>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
