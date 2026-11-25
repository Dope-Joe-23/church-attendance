import React, { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { LoadingSpinner, PageHeading } from '../components';
import {
  MdArrowForward,
  MdAssessment,
  MdDashboard,
  MdEvent,
  MdLocationOn,
  MdNotificationsActive,
  MdPeople,
  MdQrCode2,
} from 'react-icons/md';
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

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch stats from various endpoints
      const [membersRes, servicesRes, alertsRes] = await Promise.all([
        apiClient.get('/members/'),
        apiClient.get('/services/'),
        apiClient.get('/members/alerts/unresolved/')
      ]);

      // Get total members - handle pagination by using count from API
      const membersData = membersRes.data;
      const totalMembersCount = membersData.count || (membersData.results ? membersData.results.length : 0);
      
      // Get the latest services for the dashboard
      const servicesList = servicesRes.data.results || servicesRes.data;
      const allServices = Array.isArray(servicesList) ? servicesList : [];
      
      // Filter to only parent services (not sessions) - parent_service will be null for parents
      const parentServices = allServices.filter(service => service.parent_service === null);
      const latestServices = parentServices.slice(0, 3);

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
  }, []);

  useEffect(() => {
    Promise.resolve().then(fetchDashboardData);
  }, [fetchDashboardData]);

  const quickActions = [
    {
      icon: <MdQrCode2 size={20} />,
      title: 'Check-in Scanner',
      description: 'Start scanning QR codes',
      path: '/management/attendance',
      color: '#0ea5e9'
    },
    {
      icon: <MdPeople size={20} />,
      title: 'Manage Members',
      description: 'View all church members',
      path: '/management/members',
      color: '#8b5cf6'
    },
    {
      icon: <MdAssessment size={20} />,
      title: 'View Reports',
      description: 'Check attendance analytics',
      path: '/management/reports',
      color: '#f59e0b'
    },
    {
      icon: <MdEvent size={20} />,
      title: 'Manage Services',
      description: 'Organize church events',
      path: '/management/services',
      color: '#10b981'
    }
  ];

  const statCards = [
    { label: 'Total members', value: stats.totalMembers, icon: <MdPeople size={21} />, tone: 'members' },
    { label: 'Active services', value: stats.totalServices, icon: <MdEvent size={21} />, tone: 'services' },
    { label: "Today's check-ins", value: stats.todayCheckins, icon: <MdQrCode2 size={21} />, tone: 'checkins' },
    { label: 'Active alerts', value: stats.activeAlerts, icon: <MdNotificationsActive size={21} />, tone: 'alerts' },
  ];

  const handleActionClick = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <LoadingSpinner message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <PageHeading
          eyebrow="WIS Sunyani · Admin"
          title="Dashboard"
          description="A clear overview of your church community and weekly operations."
          icon={MdDashboard}
          actions={(
            <button type="button" className="btn btn-primary" onClick={() => navigate('/management')}>
              Church management <MdArrowForward aria-hidden="true" />
            </button>
          )}
        />

        {/* Stats Cards */}
        <div className="stats-grid dashboard-stats">
          {statCards.map(({ label, value, icon, tone }) => (
            <article key={tone} className={`stat-card stat-${tone}`}>
              <span className="stat-icon" aria-hidden="true">{icon}</span>
              <div className="stat-content">
                <h3>{value}</h3>
                <p>{label}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="dashboard-grid">
          {/* Quick Actions */}
          <section className="dashboard-section dashboard-actions-section">
            <div className="section-header">
              <div>
                <p className="section-kicker">Shortcuts</p>
                <h2>Quick actions</h2>
              </div>
            </div>
            <div className="actions-grid">
              {quickActions.map((action) => {
                return (
                  <button
                    key={action.path}
                    type="button"
                    className="action-card"
                    onClick={() => handleActionClick(action.path)}
                    style={{ '--action-accent': action.color }}
                  >
                    <span className="action-icon" aria-hidden="true">
                      {action.icon}
                    </span>
                    <span className="action-content">
                      <h4>{action.title}</h4>
                      <p>{action.description}</p>
                    </span>
                    <span className="action-arrow" aria-hidden="true"><MdArrowForward /></span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Upcoming Services */}
          <section className="dashboard-section dashboard-upcoming-section">
            <div className="section-header">
              <div>
                <p className="section-kicker">On the calendar</p>
                <h2>Upcoming services</h2>
              </div>
              <button
                type="button"
                className="view-all-link"
                onClick={() => navigate('/management/services')}
              >
                View all <MdArrowForward aria-hidden="true" />
              </button>
            </div>
            <div className="services-list">
              {recentServices.length > 0 ? (
                recentServices.map((service) => (
                  <div key={service.id} className="service-item">
                    <span className="service-item-icon" aria-hidden="true"><MdEvent size={18} /></span>
                    <div className="service-info">
                      <h4>{service.name}</h4>
                      <p className="service-details">
                        {service.location && (
                          <span><MdLocationOn size={14} aria-hidden="true" /> {service.location}</span>
                        )}
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
          </section>
        </div>
      </div>
    </div>
  );
};

export default Home;
