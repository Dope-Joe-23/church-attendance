import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/pages.css';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: '📱',
      title: 'QR Code Scanner',
      description: 'Quickly scan member QR codes for instant attendance check-in',
      path: '/scanner',
      color: '#3b82f6'
    },
    {
      icon: '👥',
      title: 'Member Management',
      description: 'Manage church members and their information efficiently',
      path: '/members',
      color: '#8b5cf6'
    },
    {
      icon: '📊',
      title: 'Attendance Reports',
      description: 'Generate detailed reports and analytics on attendance patterns',
      path: '/reports',
      color: '#ec4899'
    },
    {
      icon: '⛪',
      title: 'Service Management',
      description: 'Organize and manage church services and events',
      path: '/services',
      color: '#f59e0b'
    }
  ];

  const handleFeatureClick = (path) => {
    navigate(path);
  };

  return (
    <div className="home-page">
      <div className="hero">
        <div className="hero-content">
          <h1 className="hero-title">⛪ Church-In</h1>
          <p className="hero-subtitle">
            A modern solution for tracking and managing church member attendance
          </p>
          <p className="hero-description">
            Welcome to a new era of church community engagement. Seamlessly track, manage, and grow your congregation with cutting-edge technology built for faith communities.
          </p>
        </div>
        <div className="hero-background"></div>
      </div>

      <div className="features">
        {features.map((feature, index) => (
          <div
            key={index}
            className="feature-card"
            onClick={() => handleFeatureClick(feature.path)}
            style={{ '--accent-color': feature.color }}
          >
            <div className="feature-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            <div className="feature-arrow">→</div>
          </div>
        ))}
      </div>

      <div className="info-section">
        <div className="info-content">
          <div className="info-main">
            <h2>About This System</h2>
            <p>
              This church attendance system provides a comprehensive solution for
              managing member attendance at church services and events. With QR code
              technology and a user-friendly interface, attendance tracking has never
              been easier.
            </p>
          </div>
          <div className="info-features">
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
      </div>
    </div>
  );
};

export default Home;
