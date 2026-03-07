import apiClient from './apiClient';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_REFRESH_KEY = 'auth_refresh';

const authService = {
  /**
   * Register a new user account
   */
  async register(userData) {
    try {
      const response = await apiClient.post('/auth/register/', userData);

      if (response.data && response.data.tokens && response.data.tokens.access) {
        localStorage.setItem(AUTH_TOKEN_KEY, response.data.tokens.access);
        if (response.data.tokens.refresh) {
          localStorage.setItem(AUTH_REFRESH_KEY, response.data.tokens.refresh);
        }
        // Update the API client header with the token
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.tokens.access}`;
      }
      return response.data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  },

  /**
   * Login with username and password
   */
  async login(username, password) {
    try {
      const response = await apiClient.post('/token/', {
        username,
        password,
      });

      if (response.data && response.data.access) {
        localStorage.setItem(AUTH_TOKEN_KEY, response.data.access);
        if (response.data.refresh) {
          localStorage.setItem(AUTH_REFRESH_KEY, response.data.refresh);
        }
        // Update the API client header with the token
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
      }
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  /**
   * Logout - clear tokens
   */
  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_KEY);
    delete apiClient.defaults.headers.common['Authorization'];
  },

  /**
   * Get stored access token
   */
  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  /**
   * Get stored refresh token
   */
  getRefreshToken() {
    return localStorage.getItem(AUTH_REFRESH_KEY);
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getToken();
  },

  /**
   * Refresh the access token using refresh token
   */
  async refreshToken() {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post('/token/refresh/', {
        refresh: refreshToken,
      });

      if (response.data && response.data.access) {
        localStorage.setItem(AUTH_TOKEN_KEY, response.data.access);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
      }
      return response.data;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      throw error;
    }
  },

  /**
   * Initialize - set up auth header from stored token
   */
  initializeAuth() {
    const token = this.getToken();
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  },
};

// Initialize auth when the module loads
authService.initializeAuth();

export default authService;
