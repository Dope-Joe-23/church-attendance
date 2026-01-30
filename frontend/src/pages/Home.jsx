import React from 'react';
import '../styles/pages.css';

const Home = () => {
  return (
    <div className="home-page">
      <div className="hero">
        <h1>Welcome to Church Attendance System</h1>
        <p>
          A modern solution for tracking and managing church member attendance
        </p>
      </div>

      <div className="features">
        <div className="feature-card">
          <h3>📱 QR Code Scanner</h3>
          <p>Quickly scan member QR codes for instant attendance check-in</p>
        </div>
        <div className="feature-card">
          <h3>👥 Member Management</h3>
          <p>Manage church members and their information efficiently</p>
        </div>
        <div className="feature-card">
          <h3>📊 Attendance Reports</h3>
          <p>Generate detailed reports and analytics on attendance patterns</p>
        </div>
        <div className="feature-card">
          <h3>⛪ Service Management</h3>
          <p>Organize and manage church services and events</p>
        </div>
      </div>

      <div className="info-section">
        <h2>About This System</h2>
        <p>
          This church attendance system provides a comprehensive solution for
          managing member attendance at church services and events. With QR code
          technology and a user-friendly interface, attendance tracking has never
          been easier.
        </p>
        <h3>Key Features:</h3>
        <ul>
          <li>Automatic QR code generation for each member</li>
          <li>Real-time attendance tracking</li>
          <li>Service and event management</li>
          <li>Comprehensive attendance reports</li>
          <li>Admin dashboard for system management</li>
        </ul>
      </div>
    </div>
  );
};

export default Home;
