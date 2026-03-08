import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import '../styles/pages.css';

const Home = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalServices: 0,
    todayCheckins: 0,
    activeAlerts: 0
  });
  const [recentServices, setRecentServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats from various endpoints
      const [membersRes, servicesRes, alertsRes] = await Promise.all([
        apiClient.get('/members/'),
        apiClient.get('/services/'),
        apiClient.get('/members/alerts/unresolved/')
      ]);

      // Get the latest services for the dashboard
      const servicesList = servicesRes.data.results || servicesRes.data;
      const allServices = Array.isArray(servicesList) ? servicesList : [];
      
      // Filter to only parent services (not sessions) - parent_service will be null for parents
      const parentServices = allServices.filter(service => service.parent_service === null);
      const latestServices = parentServices.slice(0, 3);
      
      // Get total members - membersRes.data.results for paginated API
      const membersList = membersRes.data.results || membersRes.data;
      const totalMembersCount = Array.isArray(membersList) ? membersList.length : 0;

      setStats({
        totalMembers: totalMembersCount,
        totalServices: parentServices.length,
        todayCheckins: 0, // Would need attendance data
        activeAlerts: alertsRes.data ? alertsRes.data.length : 0
      });

      setRecentServices(latestServices);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      icon: '📱',
      title: 'Check-in Scanner',
      description: 'Start scanning QR codes',
      path: '/scanner',
      color: '#0ea5e9'
    },
    {
      icon: '👥',
      title: 'Manage Members',
      description: 'View all church members',
      path: '/members',
      color: '#8b5cf6'
    },
    {
      icon: '📊',
      title: 'View Reports',
      description: 'Check attendance analytics',
      path: '/reports',
      color: '#f59e0b'
    },
    {
      icon: '⛪',
      title: 'Manage Services',
      description: 'Organize church events',
      path: '/services',
      color: '#10b981'
    }
  ];

  const handleActionClick = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="container">
          <div className="loading-spinner">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1>Dashboard</h1>
            <p>Welcome back! Here's what's happening with your church.</p>
          </div>
          <div className="header-date">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}>
              👥
            </div>
            <div className="stat-content">
              <h3>{stats.totalMembers}</h3>
              <p>Total Members</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
              ⛪
            </div>
            <div className="stat-content">
              <h3>{stats.totalServices}</h3>
              <p>Active Services</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
              📱
            </div>
            <div className="stat-content">
              <h3>{stats.todayCheckins}</h3>
              <p>Today's Check-ins</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              🔔
            </div>
            <div className="stat-content">
              <h3>{stats.activeAlerts}</h3>
              <p>Active Alerts</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="dashboard-grid">
          {/* Quick Actions */}
          <div className="dashboard-section">
            <h2>Quick Actions</h2>
            <div className="actions-grid">
              {quickActions.map((action, index) => (
                <div
                  key={index}
                  className="action-card"
                  onClick={() => handleActionClick(action.path)}
                  style={{ borderLeftColor: action.color }}
                >
                  <div className="action-icon" style={{ color: action.color }}>
                    {action.icon}
                  </div>
                  <div className="action-content">
                    <h4>{action.title}</h4>
                    <p>{action.description}</p>
                  </div>
                  <div className="action-arrow">→</div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Services */}
          <div className="dashboard-section">
            <div className="section-header">
              <h2>Upcoming Services</h2>
              <a href="/services" className="view-all-link">View all →</a>
            </div>
            <div className="services-list">
              {recentServices.length > 0 ? (
                recentServices.map((service) => (
                  <div key={service.id} className="service-item">
                    <div className="service-info">
                      <h4>{service.name}</h4>
                      <p className="service-details">
                        {service.location && <span>📍 {service.location}</span>}
                      </p>
                      {service.date && (
                        <p className="service-date">
                          {new Date(service.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p>No services scheduled. Create one to get started!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
