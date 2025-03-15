import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, userType }) => {
  const { currentUser, loading } = useContext(AuthContext);
  
  if (loading) {
    // You could render a loading spinner here
    return <div>Loading...</div>;
  }
  
  if (!currentUser) {
    // Not logged in, redirect to login page
    return <Navigate to="/auth" />;
  }

  // Check if the user has the required user type (if specified)
  if (userType && currentUser.user_type !== userType) {
    // User is not authorized for this route, redirect to their dashboard
    if (currentUser.user_type === 'rider') {
      return <Navigate to="/rider-dashboard" />;
    } else if (currentUser.user_type === 'driver') {
      return <Navigate to="/driver-dashboard" />;
    } else if (currentUser.user_type === 'admin') {
      return <Navigate to="/admin-dashboard" />;
    } else {
      // Fallback to login page if user type is unknown
      return <Navigate to="/auth" />;
    }
  }
  
  // User is authenticated and authorized, render the protected component
  return children;
};

export default ProtectedRoute;
