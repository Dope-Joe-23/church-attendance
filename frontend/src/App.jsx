import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Navigation } from './components';
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
import authService from './services/authService';
import './styles/index.css';
import './styles/components.css';
import './styles/pages.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="app">
        <Navigation 
          isAuthenticated={isAuthenticated} 
          onLogout={() => setIsAuthenticated(false)}
        />
        <main style={{ minHeight: 'calc(100vh - 70px)' }}>
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
