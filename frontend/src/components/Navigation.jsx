import React from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/components.css';

const Navigation = ({ user, onLogout }) => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <h1>⛪ Church-In</h1>
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
