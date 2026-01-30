import React from 'react';
import '../styles/components.css';

const Navigation = ({ user, onLogout }) => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <h1>⛪ Church Attendance</h1>
        </div>
        <ul className="nav-menu">
          <li className="nav-item">
            <a href="/" className="nav-link">
              Home
            </a>
          </li>
          <li className="nav-item">
            <a href="/members" className="nav-link">
              Members
            </a>
          </li>
          <li className="nav-item">
            <a href="/services" className="nav-link">
              Services
            </a>
          </li>
          <li className="nav-item">
            <a href="/scanner" className="nav-link">
              Scanner
            </a>
          </li>
          <li className="nav-item">
            <a href="/reports" className="nav-link">
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
