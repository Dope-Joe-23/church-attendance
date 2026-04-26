import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import authService from '../services/authService';
import { MdDashboard, MdPeople, MdEvent, MdQrCode2, MdAssessment, MdFavoriteBorder, MdMenu, MdClose, MdLogout } from 'react-icons/md';
import '../styles/sidebar.css';

const Sidebar = ({ isAuthenticated, onLogout, isCollapsed, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  const isActive = (path) => {
    return location.pathname === path || (path === '/dashboard' && location.pathname === '/');
  };

  const toggleMobileSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsSidebarOpen(false); // Close sidebar after navigation
  };

  const handleLogout = () => {
    authService.logout();
    if (onLogout) {
      onLogout();
    }
    navigate('/login');
  };

  // Fetch unresolved alerts
  React.useEffect(() => {
    if (isAuthenticated) {
      fetchUnresolvedAlerts();
    }
  }, [isAuthenticated]);

  const fetchUnresolvedAlerts = async () => {
    try {
      const response = await apiClient.get('/members/alerts/unresolved/');
      setAlertCount(response.data.length);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const navItems = [
    { path: '/dashboard', icon: MdDashboard, label: 'Dashboard', authenticated: true },
    { path: '/scanner', icon: MdQrCode2, label: 'Check-in', authenticated: true },
    { path: '/members', icon: MdPeople, label: 'Members', authenticated: true },
    { path: '/services', icon: MdEvent, label: 'Services', authenticated: true },
    { path: '/reports', icon: MdAssessment, label: 'Reports', authenticated: true },
    { path: '/invitations', icon: MdQrCode2, label: 'Invitations', authenticated: true },
    {
      path: '/care',
      icon: MdFavoriteBorder,
      label: 'Care',
      authenticated: true,
      badge: alertCount > 0 ? (alertCount > 99 ? '99+' : alertCount) : null,
    },
  ];

  return (
    <>
      {/* Hamburger button - visible on all screen sizes */}
      <button className="sidebar-toggle" onClick={toggleMobileSidebar}>
        {isSidebarOpen ? <MdClose size={24} /> : <MdMenu size={24} />}
      </button>

      {/* Overlay for sidebar */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleMobileSidebar}></div>}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {/* Logo Section */}
        <div className="sidebar-logo">
          <span className="logo-icon">⛪</span>
          <h1 className="logo-text">Church-In</h1>
        </div>

        {/* Navigation Menu */}
        {isAuthenticated && (
          <nav className="sidebar-nav">
            <ul className="nav-list">
              {navItems
                .filter((item) => item.authenticated)
                .map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <li key={item.path} className="nav-item">
                      <button
                        onClick={() => handleNavigation(item.path)}
                        className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                        title={item.label}
                      >
                        <span className="nav-icon">
                          <IconComponent size={20} />
                        </span>
                        <span className="nav-label">{item.label}</span>
                        {item.badge && <span className="nav-badge">{item.badge}</span>}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </nav>
        )}

        {/* Divider */}
        {isAuthenticated && <div className="sidebar-divider"></div>}

        {/* User Actions */}
        <div className="sidebar-footer">
          {isAuthenticated ? (
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              <MdLogout size={18} />
              <span>Logout</span>
            </button>
          ) : (
            location.pathname !== '/login' && location.pathname !== '/register' && (
              <button className="login-btn" onClick={() => navigate('/login')}>
                Login
              </button>
            )
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
