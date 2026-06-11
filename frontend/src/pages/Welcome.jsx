import React from 'react';
import { useNavigate } from 'react-router-dom';
import wisLogo from '../assets/wis_logo.jpg';
import '../styles/pages.css';

const CLASSES = [
  'Airport', 'Abesim', 'Old Abesim', 'Asufufu / Adomako',
  'Baakoniaba', 'Berlin Top', 'Penkwase', 'Mayfair',
  'Odumase', 'New Dormaa / Kotokrom', 'Dumasua', 'Fiapre',
  'Magazine', 'Town Centre', 'Newtown / Estate', 'Distance',
];

const DEPARTMENTS = [
  { name: 'Technical', icon: '🔧' },
  { name: 'Media', icon: '📹' },
  { name: 'Echoes of Grace', icon: '🎵' },
  { name: 'Celestial Harmony Choir', icon: '🎶' },
  { name: 'Heavenly Vibes', icon: '🎤' },
  { name: 'Prayer & Evangelism', icon: '🙏' },
  { name: 'Visitor Care', icon: '💚' },
  { name: 'Protocol & Ushering', icon: '🤝' },
];

const Welcome = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: '📱',
      title: 'Digital Check-in',
      description: 'Class members scan QR codes for instant attendance tracking across all WIS Sunyani services',
      color: '#24106a',
    },
    {
      icon: '👥',
      title: 'Class-based Organization',
      description: 'Members organized across 16 classes — from Airport to Distance — for targeted care and outreach',
      color: '#b51f2d',
    },
    {
      icon: '📊',
      title: 'Smart Analytics',
      description: 'Comprehensive reports and attendance insights for every class, department, and service',
      color: '#f3c316',
    },
    {
      icon: '⛪',
      title: 'Service Planning',
      description: 'Streamline Sunday services, mid-week meetings, and special events with ease',
      color: '#130847',
    },
  ];

  return (
    <div className="welcome-page">
      {/* Hero Section */}
      <section className="welcome-hero">
        <div className="hero-content">
          <div className="hero-badge">⛪ Wesleyan International Society — Sunyani</div>
          <h1 className="hero-title">
            <span className="brand-highlight">WIS Sunyani</span> Attendance
          </h1>
          <p className="hero-subtitle">
            Serving the Wesleyan community across Sunyani and its surrounding areas — 
            from Airport to Fiapre, Dumasua to New Dormaa. A digital solution for tracking 
            attendance, engaging members, and strengthening our congregation.
          </p>
          <div className="hero-actions">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/register')}
            >
              Get Started
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

      {/* About Section */}
      <section className="features-section" style={{ background: 'white' }}>
        <div className="container">
          <div className="section-header">
            <h2>About WIS Sunyani</h2>
            <p>
              The Wesleyan International Society, Sunyani — a community of faith serving 
              the Bono Region of Ghana through worship, fellowship, and outreach.
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card" style={{ borderTop: '4px solid #24106a' }}>
              <div className="feature-icon" style={{ backgroundColor: '#24106a', margin: '0 auto 1.5rem' }}>📍</div>
              <h3>Our Location</h3>
              <p>Sunyani, Bono Region, Ghana — reaching communities across the region through 16 active classes.</p>
            </div>
            <div className="feature-card" style={{ borderTop: '4px solid #b51f2d' }}>
              <div className="feature-icon" style={{ backgroundColor: '#b51f2d', margin: '0 auto 1.5rem' }}>👥</div>
              <h3>Our Community</h3>
              <p>8 ministries working together — from the Celestial Harmony Choir to Protocol & Ushering — united in service.</p>
            </div>
            <div className="feature-card" style={{ borderTop: '4px solid #f3c316' }}>
              <div className="feature-icon" style={{ backgroundColor: '#f3c316', margin: '0 auto 1.5rem' }}>🎯</div>
              <h3>Our Mission</h3>
              <p>Using technology to keep our congregation connected, engaged, and cared for — no matter which class or community they belong to.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Classes Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>Our Classes</h2>
            <p>WIS Sunyani spans 16 classes across Sunyani and surrounding communities</p>
          </div>
          <div className="features-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {CLASSES.map((name, index) => (
              <div key={index} className="feature-card" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>{name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments Section */}
      <section className="features-section" style={{ background: 'white' }}>
        <div className="container">
          <div className="section-header">
            <h2>Ministries & Departments</h2>
            <p>Working together to serve the WIS Sunyani congregation</p>
          </div>
          <div className="features-grid">
            {DEPARTMENTS.map((dept, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon" style={{ backgroundColor: '#24106a', margin: '0 auto 1.5rem' }}>
                  {dept.icon}
                </div>
                <h3>{dept.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>The Attendance System</h2>
            <p>Built for WIS Sunyani — modern tools for a growing congregation</p>
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
            <h2>Join WIS Sunyani</h2>
            <p>Access the attendance system to check in, view reports, and stay connected with your class community</p>
            <img className="cta-logo" src={wisLogo} alt="Wesleyan International Society logo" />
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/register')}
            >
              Get Started
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Welcome;