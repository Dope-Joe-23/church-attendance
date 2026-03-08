import axios from 'axios';
import authService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Queue to store failed requests while token is being refreshed
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  isRefreshing = false;
  failedQueue = [];
};

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors with automatic token refresh
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Try to refresh the token
      return new Promise((resolve, reject) => {
        authService.refreshToken()
          .then(response => {
            const { access } = response;
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${access}`;
            originalRequest.headers.Authorization = `Bearer ${access}`;
            
            processQueue(null, access);
            resolve(apiClient(originalRequest));
          })
          .catch(err => {
            // Token refresh failed - clear auth and redirect to login
            authService.logout();
            processQueue(err, null);
            window.location.href = '/login';
            reject(err);
          });
      });
    }

    // Log error details for debugging
    if (error.response?.status === 400) {
      console.error('400 Bad Request:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
