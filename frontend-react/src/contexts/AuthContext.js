import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Check if the user is already logged in via session token in localStorage
    const checkAuthStatus = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          console.log('Verifying session with token...');
          const response = await api.get('/auth/verify-session');
          console.log('Session verification response:', response.data);
          setCurrentUser(response.data.user);
        } catch (error) {
          console.error('Session validation failed:', error);
          // Clear any invalid tokens
          localStorage.removeItem('token');
          setCurrentUser(null);
        }
      } else {
        console.log('No auth token found in localStorage');
        setCurrentUser(null);
      }
      
      setLoading(false);
      setAuthChecked(true);
    };

    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('Login attempt for:', email);
      const response = await api.post('/auth/login', { email, password });
      console.log('Login response:', response.data);
      
      // Check if the response contains the expected data
      if (!response.data || !response.data.token || !response.data.user) {
        throw new Error('Invalid response format from server');
      }
      
      localStorage.setItem('token', response.data.token);
      setCurrentUser(response.data.user);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      throw error.response?.data || { message: 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Clear user data anyway
      localStorage.removeItem('token');
      setCurrentUser(null);
    }
  };

  const value = {
    currentUser,
    loading,
    authChecked,
    login,
    register,
    logout,
    setCurrentUser
  };

  // Only render children once the initial auth check is complete
  return (
    <AuthContext.Provider value={value}>
      {authChecked ? children : (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
