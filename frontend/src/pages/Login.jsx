import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import '../styles/pages.css';

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); // Toggle between login and register
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    invitation_code: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login
        await authService.login(formData.username, formData.password);
        // Call the success callback
        if (onLoginSuccess) {
          onLoginSuccess();
        }
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        // Registration
        if (formData.password !== formData.password_confirm) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }

        await authService.register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          password_confirm: formData.password_confirm,
          first_name: formData.first_name,
          last_name: formData.last_name,
          invitation_code: formData.invitation_code
        });
        // Call the success callback
        if (onLoginSuccess) {
          onLoginSuccess();
        }
        // Navigate to dashboard
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(`${isLogin ? 'Login' : 'Registration'} error:`, err);
      setError(
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        `${isLogin ? 'Login' : 'Registration'} failed. Please try again.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      username: '',
      email: '',
      password: '',
      password_confirm: '',
      first_name: '',
      last_name: '',
      invitation_code: ''
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Church Attendance System</h1>
          <p>{isLogin ? 'Admin Login' : 'User Registration'}</p>
        </div>

        {/* Mode Toggle */}
        <div className="auth-toggle">
          <button
            type="button"
            className={`toggle-btn ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            type="button"
            className={`toggle-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Enter your username"
              className="input-field"
              required
              disabled={isLoading}
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="invitation_code">Invitation Code *</label>
                <input
                  id="invitation_code"
                  name="invitation_code"
                  type="text"
                  value={formData.invitation_code}
                  onChange={handleInputChange}
                  placeholder="Enter your invitation code"
                  className="input-field"
                  required
                  disabled={isLoading}
                />
                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                  You need an invitation code to register. Ask your administrator.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className="input-field"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="first_name">First Name</label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    placeholder="First name"
                    className="input-field"
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="last_name">Last Name</label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    placeholder="Last name"
                    className="input-field"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              className="input-field"
              required
              disabled={isLoading}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="password_confirm">Confirm Password</label>
              <input
                id="password_confirm"
                name="password_confirm"
                type="password"
                value={formData.password_confirm}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                className="input-field"
                required
                disabled={isLoading}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={isLoading}
          >
            {isLoading ? (isLogin ? 'Logging in...' : 'Registering...') : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2026 Church Attendance System</p>
          <p>{isLogin ? 'For admin access, please use your assigned credentials' : 'Create an account to access the system'}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
