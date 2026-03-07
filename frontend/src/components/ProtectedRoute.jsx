import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

const ProtectedRoute = ({ element }) => {
  if (authService.isAuthenticated()) {
    return element;
  }

  // Redirect to login if not authenticated
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
