import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include the auth token in all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Handle 401 Unauthorized errors by redirecting to login
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

// Mock API functions for development until the backend is ready
// Remove these when connecting to a real backend
if (process.env.NODE_ENV === 'development') {
  // Mock login
  api.post.mockResolvedValueOnce('/auth/login', (config) => {
    const { email, password } = JSON.parse(config.data);
    if (email === 'rider@example.com' && password === 'password') {
      return [200, {
        token: 'mock-token-rider',
        user: { user_id: 1, name: 'Test Rider', user_type: 'rider', email }
      }];
    } else if (email === 'driver@example.com' && password === 'password') {
      return [200, {
        token: 'mock-token-driver',
        user: { user_id: 2, name: 'Test Driver', user_type: 'driver', email }
      }];
    } else {
      return [401, { message: 'Invalid credentials' }];
    }
  });
  
  // Mock rider location data
  api.get.mockImplementation('/riders/:id/location', (config) => {
    return [200, {
      location: 'Koramangala, Bengaluru',
      latitude: 12.9352,
      longitude: 77.6245
    }];
  });
  
  // Mock driver location data
  api.get.mockImplementation('/drivers/:id/location', (config) => {
    return [200, {
      location: 'Indiranagar, Bengaluru',
      latitude: 12.9784,
      longitude: 77.6408
    }];
  });
}

export default api;
