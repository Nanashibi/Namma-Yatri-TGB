import React, { createContext, useState, useContext } from 'react';
import GoogleMapsWrapper from '../components/common/GoogleMapsWrapper';

// Create context
const GoogleMapsContext = createContext({
  isLoaded: false,
  setIsLoaded: () => {},
});

// Provider component
export const GoogleMapsProvider = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  
  return (
    <GoogleMapsContext.Provider value={{ isLoaded, setIsLoaded }}>
      <GoogleMapsWrapper googleMapsApiKey={googleMapsApiKey}>
        {children}
      </GoogleMapsWrapper>
    </GoogleMapsContext.Provider>
  );
};

// Hook for using the Google Maps context
export const useGoogleMaps = () => useContext(GoogleMapsContext);

export default GoogleMapsContext;
