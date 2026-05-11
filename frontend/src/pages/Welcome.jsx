import React from 'react';
import { useNavigate } from 'react-router-dom';
import wisLogo from '../assets/wis_logo.jpg';
import '../styles/pages.css';

const Welcome = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: '📱',
      title: 'Digital Check-in',
      description: 'Members scan QR codes for instant attendance tracking',
      color: '#24106a'
    },
    {
      icon: '📊',
      title: 'Smart Analytics',
      description: 'Comprehensive reports and attendance insights',
      color: '#b51f2d'
    },
    {
      icon: '👥',
      title: 'Member Management',
      description: 'Organize and connect with your congregation',
      color: '#f3c316'
    },
    {
      icon: '⛪',
      title: 'Service Planning',
      description: 'Streamline event management and coordination',
      color: '#130847'
    }
  ];

  return (
    <div className="welcome-page">
      {/* Hero Section */}
      <section className="welcome-hero">
        <div className="hero-content">
          <div className="hero-badge">✨ Modern Church Management</div>
          <h1 className="hero-title">
            Welcome to <span className="brand-highlight">WIS Sunyani</span>
          </h1>
          <p className="hero-subtitle">
            Transform your church attendance tracking with our seamless digital solution.
            Connect, engage, and grow your congregation with ease.
          </p>
          <div className="hero-actions">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/register')}
            >
              Get Started Free
            </button>
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="mockup-container">
            <div className="phone-mockup">
              <div className="phone-screen">
                <div className="app-preview">
                  <div className="preview-header">
                    <img className="preview-logo" src={wisLogo} alt="Wesleyan International Society logo" />
                    <span className="preview-icon">⛪</span>
                    <span className="preview-title">WIS Sunyani</span>
                  </div>
                  <div className="preview-content">
                    <div className="qr-placeholder">
                      <div className="qr-code">📱</div>
                      <p>Scan to Check-in</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>Everything You Need</h2>
            <p>Powerful features designed for modern churches</p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div
                  className="feature-icon"
                  style={{ backgroundColor: feature.color }}
                >
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Modernize Your Church?</h2>
            <p>Attendance and care tools customized for WIS Sunyani</p>
            <img className="cta-logo" src={wisLogo} alt="Wesleyan International Society logo" />
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/register')}
            >
              Start Your Free Trial
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Welcome;
