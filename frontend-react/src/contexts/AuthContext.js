import React, { createContext, useState, useEffect } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if the user is already logged in via session token in localStorage
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/auth/verify-session');
          setCurrentUser(response.data.user);
        } catch (error) {
          console.error('Session validation failed:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      setCurrentUser(response.data.user);
      return response.data;
    } catch (error) {
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
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
