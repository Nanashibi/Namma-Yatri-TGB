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

// Create mock implementation only if we're in development and REACT_APP_USE_MOCK_API is set
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_MOCK_API === 'true') {
  console.warn('Using mock API - connect to a real backend for production');
  
  // Define mock data
  const mockUsers = [
    { 
      user_id: 1, 
      name: 'Test Rider', 
      user_type: 'rider', 
      email: 'rider@example.com',
      password: 'password'
    },
    { 
      user_id: 2, 
      name: 'Test Driver', 
      user_type: 'driver', 
      email: 'driver@example.com',
      password: 'password',
      is_available: true
    },
    { 
      user_id: 3, 
      name: 'Admin User', 
      user_type: 'admin', 
      email: 'admin@example.com',
      password: 'password'
    }
  ];

  // Mock interceptor
  const mockAxios = axios.create();
  mockAxios.interceptors.request.use(async (config) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Extract endpoint and method
    const url = config.url;
    const method = config.method.toLowerCase();
    
    // Define mock responses for various endpoints
    if (url === '/auth/login' && method === 'post') {
      const data = JSON.parse(config.data);
      const user = mockUsers.find(u => 
        u.email === data.email && u.password === data.password
      );
      
      if (user) {
        return {
          data: {
            token: `mock-token-${user.user_type}-${user.user_id}`,
            user: {
              user_id: user.user_id,
              name: user.name,
              user_type: user.user_type,
              email: user.email
            }
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        };
      } else {
        // Fix: Create and throw a proper error object
        const error = new Error('Invalid email or password');
        error.response = {
          data: { message: 'Invalid email or password' },
          status: 401,
          statusText: 'Unauthorized'
        };
        throw error;
      }
    }
    
    // Add more mock endpoints as needed
    
    // Default behavior for non-mocked endpoints
    console.warn(`API request not mocked: ${method} ${url}`);
    return config;
  });

  // Override the original api methods
  api.get = mockAxios.get;
  api.post = mockAxios.post;
  api.put = mockAxios.put;
  api.delete = mockAxios.delete;
}

export default api;
