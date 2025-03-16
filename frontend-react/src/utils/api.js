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
      // Handle 401 Unauthorized errors but don't redirect immediately during page loads
      if (error.response.status === 401) {
        // Don't clear token for verify-session requests - let the AuthContext handle this
        if (!error.config.url.includes('verify-session')) {
          localStorage.removeItem('token');
          // Don't immediately redirect for session checks - authContext will handle redirects more gracefully
          if (!error.config.url.includes('auth')) {
            window.location.href = '/auth';
          }
        }
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
      name: 'Test Customer', 
      user_type: 'customer', 
      email: 'customer@example.com',
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

  // Mock data for admin dashboard
  const mockDrivers = [
    {
      driver_id: 1,
      name: 'Ramesh Kumar',
      is_available: true,
      location: 'Koramangala',
      rating: 4.8
    },
    {
      driver_id: 2,
      name: 'Suresh Patel',
      is_available: false,
      location: 'Indiranagar',
      rating: 4.5
    },
    {
      driver_id: 3,
      name: 'Mahesh Singh',
      is_available: true,
      location: 'Whitefield',
      rating: 4.9
    },
    {
      driver_id: 4,
      name: 'Dinesh Rao',
      is_available: true,
      location: 'HSR Layout',
      rating: 4.7
    }
  ];

  const mockCustomers = [
    {
      customer_id: 1,
      name: 'Priya Sharma',
      email: 'priya.s@example.com',
      trip_count: 15
    },
    {
      customer_id: 2,
      name: 'Vikram Iyer',
      email: 'viyer@example.com',
      trip_count: 8
    },
    {
      customer_id: 3,
      name: 'Ananya Desai',
      email: 'ananya.d@example.com',
      trip_count: 22
    },
    {
      customer_id: 4,
      name: 'Rahul Agarwal',
      email: 'rahul.a@example.com',
      trip_count: 5
    }
  ];

  const mockTrips = [
    {
      trip_id: 'T12345',
      customer_id: 1,
      customer_name: 'Priya Sharma',
      driver_id: 2,
      driver_name: 'Suresh Patel',
      pickup: 'Koramangala',
      destination: 'Whitefield',
      fare: 250,
      status: 'completed',
      date: '2023-04-15T14:30:00'
    },
    {
      trip_id: 'T12346',
      customer_id: 3,
      customer_name: 'Ananya Desai',
      driver_id: 1,
      driver_name: 'Ramesh Kumar',
      pickup: 'HSR Layout',
      destination: 'Electronic City',
      fare: 300,
      status: 'completed',
      date: '2023-04-16T09:15:00'
    },
    {
      trip_id: 'T12347',
      customer_id: 2,
      customer_name: 'Vikram Iyer',
      driver_id: 3,
      driver_name: 'Mahesh Singh',
      pickup: 'Indiranagar',
      destination: 'MG Road',
      fare: 180,
      status: 'completed',
      date: '2023-04-16T18:45:00'
    },
    {
      trip_id: 'T12348',
      customer_id: 4,
      customer_name: 'Rahul Agarwal',
      driver_id: 4,
      driver_name: 'Dinesh Rao',
      pickup: 'JP Nagar',
      destination: 'Marathahalli',
      fare: 220,
      status: 'ongoing',
      date: '2023-04-17T11:30:00'
    },
    {
      trip_id: 'T12349',
      customer_id: 1,
      customer_name: 'Priya Sharma',
      driver_id: 2,
      driver_name: 'Suresh Patel',
      pickup: 'BTM Layout',
      destination: 'Airport',
      fare: 450,
      status: 'cancelled',
      date: '2023-04-17T05:45:00'
    }
  ];

  // Mock prebooking data
  const mockPrebookings = [
    {
      ride_id: "PB123",
      customer_id: 1,
      ward: "Koramangala",
      pickup_time: "2023-07-20T09:30:00",
      status: "pending",
      created_at: "2023-07-18T14:25:00"
    },
    {
      ride_id: "PB124",
      customer_id: 1,
      ward: "Indiranagar",
      pickup_time: "2023-07-21T18:00:00",
      status: "accepted",
      driver_id: 2,
      driver_name: "Suresh Patel",
      created_at: "2023-07-18T16:10:00"
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
    
    // Mock dynamic routing endpoints
    if (url === '/dynamic-routing/peak-hours' && method === 'get') {
      return {
        data: [
          { hour: 8, formatted: '8 AM' },
          { hour: 17, formatted: '5 PM' },
          { hour: 9, formatted: '9 AM' },
          { hour: 18, formatted: '6 PM' },
          { hour: 19, formatted: '7 PM' }
        ],
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }
    
    if (url === '/dynamic-routing/high-demand-wards' && method === 'get') {
      return {
        data: ['Koramangala', 'Indiranagar', 'Whitefield', 'Electronic City', 'HSR Layout'],
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }
    
    if (url === '/dynamic-routing/optimal-routes' && method === 'get') {
      return {
        data: [
          { from: 'JP Nagar', to: 'Koramangala', path: ['JP Nagar', 'BTM Layout', 'Koramangala'] },
          { from: 'Marathahalli', to: 'Indiranagar', path: ['Marathahalli', 'Indiranagar'] },
          { from: 'Jayanagar', to: 'Electronic City', path: ['Jayanagar', 'BTM Layout', 'Electronic City'] },
          { from: 'Yelahanka', to: 'Whitefield', path: ['Yelahanka', 'Indiranagar', 'Whitefield'] }
        ],
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }

    // Mock admin endpoints
    if (url.includes('/admin/drivers') && method === 'get') {
      return {
        data: {
          drivers: mockDrivers
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }
    
    if (url.includes('/admin/customers') && method === 'get') {
      return {
        data: {
          customers: mockCustomers
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }
    
    if (url.includes('/admin/trips') && method === 'get') {
      return {
        data: {
          trips: mockTrips
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }

    // Mock prebooking endpoints
    if (url === '/prebooking/prebook/' && method === 'post') {
      const data = JSON.parse(config.data);
      const ride_id = `PB${Date.now().toString().slice(-5)}`;
      
      const newPrebooking = {
        ride_id,
        customer_id: data.customer_id,
        ward: data.ward,
        pickup_time: data.pickup_time,
        status: "pending",
        created_at: new Date().toISOString()
      };
      
      mockPrebookings.push(newPrebooking);
      
      return {
        data: {
          message: `Ride ${ride_id} prebooked successfully`,
          ride_id
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }
    
    if (url.match(/\/prebooking\/customer\/\d+\/rides/) && method === 'get') {
      const customerId = parseInt(url.split('/')[3]);
      const customerPrebookings = mockPrebookings.filter(
        booking => booking.customer_id === customerId
      );
      
      return {
        data: {
          prebooked_rides: customerPrebookings
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }
    
    if (url === '/prebooking/cancel_prebook/' && method === 'post') {
      const data = JSON.parse(config.data);
      const rideIndex = mockPrebookings.findIndex(
        booking => booking.ride_id === data.ride_id && 
                 booking.customer_id === data.customer_id
      );
      
      if (rideIndex >= 0) {
        mockPrebookings[rideIndex].status = 'cancelled';
        
        return {
          data: {
            message: `Ride ${data.ride_id} cancelled. Penalty added to customer ${data.customer_id}`
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        };
      } else {
        const error = new Error('Ride not found or already cancelled');
        error.response = {
          data: { detail: 'Ride not found or already accepted/cancelled' },
          status: 404,
          statusText: 'Not Found'
        };
        throw error;
      }
    }

    // Add mock verification for session
    if (url === '/auth/verify-session' && method === 'get') {
      const token = config.headers.Authorization?.split(' ')[1];
      
      if (token && token.startsWith('mock-token-')) {
        // Parse token information
        const [_, userType, userId] = token.split('-');
        const user = mockUsers.find(u => 
          u.user_id === parseInt(userId) && u.user_type === userType
        );
        
        if (user) {
          console.log(`Mock session verified for: ${user.name} (${userType})`);
          return {
            data: {
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
        }
      }
      
      // Return proper unauthorized error instead of throwing to allow smoother error handling
      return {
        data: { message: 'Invalid or expired session' },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config
      };
    }

    // Mock customer location endpoint
    if (url.match(/\/customers\/\d+\/location/) && method === 'get') {
      const customerId = parseInt(url.split('/')[2]);
      
      // Generate a random location in Bengaluru area for the customer
      const bengaluruLocations = [
        { location: "Koramangala", latitude: 12.9352, longitude: 77.6245 },
        { location: "Indiranagar", latitude: 12.9784, longitude: 77.6408 },
        { location: "HSR Layout", latitude: 12.9116, longitude: 77.6474 },
        { location: "BTM Layout", latitude: 12.9166, longitude: 77.6101 },
        { location: "JP Nagar", latitude: 12.9102, longitude: 77.5922 }
      ];
      
      // Either use a fixed location based on customer ID or a random one
      const locationIndex = (customerId % bengaluruLocations.length);
      const mockLocation = bengaluruLocations[locationIndex];
      
      return {
        data: mockLocation,
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }
    
    // Mock customer location refresh endpoint
    if (url.match(/\/customers\/\d+\/refresh-location/) && method === 'post') {
      const customerId = parseInt(url.split('/')[2]);
      
      const bengaluruLocations = [
        { location_name: "Koramangala", latitude: 12.9352, longitude: 77.6245 },
        { location_name: "Indiranagar", latitude: 12.9784, longitude: 77.6408 },
        { location_name: "HSR Layout", latitude: 12.9116, longitude: 77.6474 },
        { location_name: "BTM Layout", latitude: 12.9166, longitude: 77.6101 },
        { location_name: "JP Nagar", latitude: 12.9102, longitude: 77.5922 }
      ];
      
      // Get a random location
      const randomIndex = Math.floor(Math.random() * bengaluruLocations.length);
      const mockLocation = bengaluruLocations[randomIndex];
      
      return {
        data: mockLocation,
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }
    
    // Mock driver profile endpoint
    if (url.match(/\/drivers\/\d+\/profile/) && method === 'get') {
      const driverId = parseInt(url.split('/')[2]);
      const driver = mockDrivers.find(d => d.driver_id === driverId) || {
        driver_id: driverId,
        name: 'Unknown Driver',
        is_available: false,
        location: 'Unknown',
        rating: 0
      };
      
      return {
        data: driver,
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }
    
    // Mock driver toggle availability endpoint
    if (url.match(/\/drivers\/\d+\/toggle_availability/) && method === 'post') {
      const driverId = parseInt(url.split('/')[2]);
      const data = JSON.parse(config.data);
      const driverIndex = mockDrivers.findIndex(d => d.driver_id === driverId);
      
      if (driverIndex >= 0) {
        mockDrivers[driverIndex].is_available = data.is_available;
      }
      
      return {
        data: { 
          success: true,
          is_available: data.is_available 
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }
    
    // Mock prebooked rides for driver endpoint
    if (url.match(/\/prebooking\/driver\/\d+\/available_rides/) && method === 'get') {
      const driverId = parseInt(url.split('/')[3]);
      // Only return prebooked rides if driver is available
      const driver = mockDrivers.find(d => d.driver_id === driverId);
      
      if (driver && driver.is_available) {
        return {
          data: {
            prebooked_rides: [
              { 
                ride_id: "PB12345", 
                ward: "Koramangala", 
                pickup_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
                estimated_fare: 250,
                customer_name: "Priya Sharma", 
                customer_rating: 4.8
              },
              { 
                ride_id: "PB12346", 
                ward: "Indiranagar", 
                pickup_time: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
                estimated_fare: 320,
                customer_name: "Rahul Agarwal", 
                customer_rating: 4.5
              }
            ]
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        };
      } else {
        return {
          data: {
            prebooked_rides: []
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        };
      }
    }
    
    // Mock pending rides for driver endpoint
    if (url.match(/\/drivers\/\d+\/pending_rides/) && method === 'get') {
      const driverId = parseInt(url.split('/')[2]);
      // Only return pending rides if driver is available
      const driver = mockDrivers.find(d => d.driver_id === driverId);
      
      if (driver && driver.is_available) {
        return {
          data: {
            pending_rides: [
              {
                ride_id: "R98765",
                customer_name: "Ananya Desai",
                pickup: "HSR Layout",
                destination: "Electronic City",
                fare: 300,
                distance: "12.4 km",
                customer_rating: 4.9
              }
            ]
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        };
      } else {
        return {
          data: {
            pending_rides: []
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        };
      }
    }
    
    // Mock accept prebooked ride endpoint
    if (url === '/prebooking/accept_prebook' && method === 'post') {
      const data = JSON.parse(config.data);
      
      return {
        data: {
          success: true,
          message: `Ride ${data.ride_id} accepted successfully`
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }
    
    // Mock decline prebooked ride endpoint
    if (url === '/prebooking/decline_prebook' && method === 'post') {
      const data = JSON.parse(config.data);
      
      return {
        data: {
          success: true,
          message: `Ride ${data.ride_id} declined successfully`
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }
    
    // Mock accept regular ride endpoint
    if (url.match(/\/drivers\/\d+\/accept_ride/) && method === 'post') {
      const data = JSON.parse(config.data);
      
      return {
        data: {
          success: true,
          message: `Ride ${data.ride_id} accepted successfully`
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }
    
    // Mock decline regular ride endpoint
    if (url.match(/\/drivers\/\d+\/decline_ride/) && method === 'post') {
      const data = JSON.parse(config.data);
      
      return {
        data: {
          success: true,
          message: `Ride ${data.ride_id} declined successfully`
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    }

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
