# Namma Yatri - React Frontend

This is the React frontend for the Namma Yatri ride-booking application.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/Namma-Yatri-TGB.git
   cd Namma-Yatri-TGB/frontend-react
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root folder with the following content:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. Start the development server:
   ```
   npm start
   ```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Features

- User authentication (login/registration)
- customer dashboard
- Driver dashboard
- Admin dashboard
- Location tracking
- Ride booking
- Ride status management

## Folder Structure

```
frontend-react/
  ├── public/                 # Public assets
  ├── src/                    # Source files
  │   ├── components/         # React components
  │   │   ├── admin/          # Admin-related components
  │   │   ├── auth/           # Authentication components
  │   │   ├── common/         # Shared components
  │   │   ├── driver/         # Driver-related components
  │   │   └── customer/          # customer-related components
  │   ├── contexts/           # React context APIs
  │   ├── utils/              # Utility functions
  │   ├── App.css             # Global CSS
  │   ├── App.js              # Main App component
  │   └── index.js            # Entry point
  └── package.json           # NPM package configuration
```

## Development Notes

- All API calls are currently mocked in development mode.
- Implement proper API calls when connecting to a real backend.
- Update environment variables in production.
