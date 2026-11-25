import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import authService from '../services/authService';
import {
  MdBusiness,
  MdChevronLeft,
  MdChevronRight,
  MdDashboard,
  MdFavoriteBorder,
  MdLogout,
  MdMenu,
  MdClose,
  MdPublic,
  MdQrCode2,
} from 'react-icons/md';
import wisLogo from '../assets/wis_logo.jpg';
import '../styles/sidebar.css';

const Sidebar = ({ isAuthenticated, onLogout, isCollapsed, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (!isSidebarOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsSidebarOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isSidebarOpen]);

  const getPageName = () => {
    const pageNames = {
      '/dashboard': 'Dashboard',
      '/': 'Dashboard',
      '/management': 'Church Management',
      '/management/services': 'Services',
      '/management/attendance': 'Attendance',
      '/management/members': 'Members',
      '/management/reports': 'Reports',
      '/website': 'Church Website',
      '/care': 'Care',
      '/invitations': 'Invitations',
    };
    return pageNames[location.pathname] || 'Church-in';
  };

  const isActive = (path) => {
    return location.pathname === path ||
      (path === '/dashboard' && location.pathname === '/') ||
      (path === '/management' && location.pathname.startsWith('/management'));
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
    { path: '/website', icon: MdPublic, label: 'Church Website', authenticated: true },
    { path: '/management', icon: MdBusiness, label: 'Church Management', authenticated: true },
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
      {/* Top Navbar - visible on mobile/tablet */}
      <div className="top-navbar">
        <div className="navbar-logo">
          <img className="navbar-logo-img" src={wisLogo} alt="Wesleyan International Society logo" />
          <span className="navbar-page-name">{getPageName()}</span>
        </div>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={toggleMobileSidebar}
          aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isSidebarOpen}
          aria-controls="app-sidebar"
        >
          {isSidebarOpen ? <MdClose size={24} aria-hidden="true" /> : <MdMenu size={24} aria-hidden="true" />}
        </button>
      </div>

      {/* Overlay for sidebar */}
      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation menu"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        id="app-sidebar"
        className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
        aria-label="Main navigation"
      >
        {/* Logo Section */}
        <div className="sidebar-logo">
          <img className="sidebar-logo-img" src={wisLogo} alt="Wesleyan International Society logo" />
          <div className="sidebar-brand-text">
            <h1 className="logo-text">WIS Sunyani</h1>
            <p>Attendance System</p>
          </div>
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <MdChevronRight size={19} /> : <MdChevronLeft size={19} />}
          </button>
        </div>

        {/* Navigation Menu */}
        {isAuthenticated && (
          <nav className="sidebar-nav" aria-label="Main menu">
            <p className="sidebar-section-label">Workspace</p>
            <ul className="nav-list">
              {navItems
                .filter((item) => item.authenticated)
                .map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <li key={item.path} className="nav-item">
                      <button
                        type="button"
                        onClick={() => handleNavigation(item.path)}
                        className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                        title={item.label}
                        aria-current={isActive(item.path) ? 'page' : undefined}
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
            <button type="button" className="logout-btn" onClick={handleLogout} title="Logout">
              <MdLogout size={18} />
              <span>Logout</span>
            </button>
          ) : (
            location.pathname !== '/login' && location.pathname !== '/register' && (
              <button type="button" className="login-btn" onClick={() => navigate('/login')}>
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
