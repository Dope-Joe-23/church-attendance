import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/pages.css';

const Welcome = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: '📱',
      title: 'Digital Check-in',
      description: 'Members scan QR codes for instant attendance tracking',
      color: '#6366f1'
    },
    {
      icon: '📊',
      title: 'Smart Analytics',
      description: 'Comprehensive reports and attendance insights',
      color: '#8b5cf6'
    },
    {
      icon: '👥',
      title: 'Member Management',
      description: 'Organize and connect with your congregation',
      color: '#06b6d4'
    },
    {
      icon: '⛪',
      title: 'Service Planning',
      description: 'Streamline event management and coordination',
      color: '#10b981'
    }
  ];

  return (
    <div className="welcome-page">
      {/* Hero Section */}
      <section className="welcome-hero">
        <div className="hero-content">
          <div className="hero-badge">✨ Modern Church Management</div>
          <h1 className="hero-title">
            Welcome to <span className="brand-highlight">ChurchFlow</span>
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
                    <span className="preview-icon">⛪</span>
                    <span className="preview-title">ChurchFlow</span>
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
            <p>Join thousands of churches already using ChurchFlow</p>
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