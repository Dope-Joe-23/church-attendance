import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sidebar, LoadingSpinner } from './components';
import ProtectedRoute from './components/ProtectedRoute';
import {
  Home,
  Welcome,
  Login,
  Members,
  Services,
  Scanner,
  Reports,
  CareDashboard,
} from './pages';
import InvitationCodesPage from './pages/InvitationCodes';
import authService from './services/authService';
import './styles/index.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/sidebar.css';
import './styles/invitation-manager.css';

function AppContent() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Determine if we're on an auth page
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  // Check authentication status on mount and whenever storage changes
  useEffect(() => {
    // Initialize auth header from stored token
    authService.initializeAuth();
    
    const checkAuth = () => {
      setIsAuthenticated(authService.isAuthenticated());
    };

    // Initial check
    checkAuth();
    setIsLoading(false);

    // Listen for storage changes (from other tabs/windows or login/logout)
    window.addEventListener('storage', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="app-loading">
        <LoadingSpinner message="Initializing app..." />
      </div>
    );
  }

  return (
    <div className="app">
      {!isAuthPage && (
        <Sidebar 
          isAuthenticated={isAuthenticated} 
          onLogout={() => setIsAuthenticated(false)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      )}
      <main className={`app-main ${!isAuthPage && isAuthenticated ? 'with-sidebar' : ''} ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Routes>
            <Route 
              path="/login" 
              element={<Login onLoginSuccess={() => setIsAuthenticated(true)} />} 
            />
            <Route 
              path="/register" 
              element={<Login onLoginSuccess={() => setIsAuthenticated(true)} />} 
            />
            <Route
              path="/"
              element={
                isAuthenticated ? 
                  <Navigate to="/dashboard" replace /> : 
                  <Welcome />
              }
            />
            <Route
              path="/dashboard"
              element={<ProtectedRoute element={<Home />} />}
            />
            <Route
              path="/members"
              element={<ProtectedRoute element={<Members />} />}
            />
            <Route
              path="/services"
              element={<ProtectedRoute element={<Services />} />}
            />
            <Route
              path="/scanner"
              element={<ProtectedRoute element={<Scanner />} />}
            />
            <Route
              path="/reports"
              element={<ProtectedRoute element={<Reports />} />}
            />
            <Route
              path="/care"
              element={<ProtectedRoute element={<CareDashboard />} />}
            />
            <Route
              path="/invitations"
              element={<ProtectedRoute element={<InvitationCodesPage />} />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
