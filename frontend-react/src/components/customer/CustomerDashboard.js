import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { AuthContext } from '../../contexts/AuthContext';
import Navbar from '../common/Navbar';
import api from '../../utils/api';

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const CustomerDashboard = () => {
  const { currentUser } = useContext(AuthContext);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destinationInput, setDestinationInput] = useState('');
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchingDrivers, setSearchingDrivers] = useState(false);
  const [showPickupInfoWindow, setShowPickupInfoWindow] = useState(false);
  const [showDestinationInfoWindow, setShowDestinationInfoWindow] = useState(false);
  const [directions, setDirections] = useState(null);
  const [geocoding, setGeocoding] = useState(false);

  // Google Maps API key from environment variables
  const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  
  // Default center in Bengaluru
  const defaultCenter = useMemo(() => ({ lat: 12.9716, lng: 77.5946 }), []);

  // Load Google Maps API with useJsApiLoader hook
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey,
    libraries: ['places'],
  });
  
  // Function to fetch customer location data
  const fetchCustomerLocation = useCallback(async () => {
    if (!currentUser || !currentUser.user_id) return;
    
    try {
      setLoading(true);
      console.log(`Fetching location for customer ID: ${currentUser.user_id}`);
      const response = await api.get(`/customers/${currentUser.user_id}/location`);
      console.log("Location data received:", response.data);
      
      if (response.data && response.data.latitude && response.data.longitude) {
        setPickupLocation({
          ...response.data,
          // Ensure location data is properly typed as numbers
          latitude: Number(response.data.latitude),
          longitude: Number(response.data.longitude)
        });
      } else {
        console.warn("Received incomplete location data");
        setPickupLocation(null);
      }
    } catch (error) {
      console.error('Error fetching customer location:', error);
      setMessage({ type: 'danger', text: 'Failed to load location' });
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Initial data loading
  useEffect(() => {
    if (currentUser) {
      fetchCustomerLocation();
    }
  }, [currentUser, fetchCustomerLocation]);

  const handleRefreshLocation = async () => {
    try {
      setLoading(true);
      const response = await api.post(`/customers/${currentUser.user_id}/refresh-location`);
      
      if (response.data) {
        setPickupLocation({
          location: response.data.location_name,
          latitude: Number(response.data.latitude),
          longitude: Number(response.data.longitude)
        });
        
        // Clear destination and directions when updating pickup location
        setDestinationLocation(null);
        setDirections(null);
      }
      
      setMessage({ type: 'success', text: 'Location updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error refreshing location:', error);
      setMessage({ type: 'danger', text: 'Failed to update location' });
    } finally {
      setLoading(false);
    }
  };

  // Function to geocode the destination address to get coordinates
  const geocodeAddress = useCallback((address) => {
    if (!isLoaded || !window.google) return;
    
    const geocoder = new window.google.maps.Geocoder();
    setGeocoding(true);
    
    geocoder.geocode({ address: address + ', Bengaluru, Karnataka, India' }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        setDestinationLocation({
          location: results[0].formatted_address,
          latitude: location.lat(),
          longitude: location.lng()
        });
        
        // If we have both pickup and destination, calculate directions
        if (pickupLocation) {
          calculateDirections(
            { lat: pickupLocation.latitude, lng: pickupLocation.longitude },
            { lat: location.lat(), lng: location.lng() }
          );
        }
      } else {
        console.error('Geocoding failed:', status);
        setMessage({ type: 'warning', text: 'Could not find that location, please try again' });
      }
      setGeocoding(false);
    });
  }, [isLoaded, pickupLocation]);

  // Calculate directions between two points
  const calculateDirections = useCallback((origin, destination) => {
    if (!isLoaded || !window.google) return;
    
    const directionsService = new window.google.maps.DirectionsService();
    
    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
        } else {
          console.error('Directions request failed:', status);
          setMessage({ type: 'warning', text: 'Could not calculate route' });
        }
      }
    );
  }, [isLoaded]);

  const handleSearchDestination = (e) => {
    e.preventDefault();
    
    if (!destinationInput) {
      setMessage({ type: 'warning', text: 'Please enter a destination' });
      return;
    }
    
    // Geocode the address to get coordinates
    geocodeAddress(destinationInput);
  };

  const handleBookRide = async (e) => {
    e.preventDefault();
    
    if (!destinationLocation) {
      setMessage({ type: 'warning', text: 'Please search for a destination first' });
      return;
    }
    
    setSearchingDrivers(true);
    try {
      console.log("Booking ride with data:", {
        destination: destinationLocation.location,
        pickup_lat: pickupLocation.latitude,
        pickup_lng: pickupLocation.longitude,
        destination_lat: destinationLocation.latitude,
        destination_lng: destinationLocation.longitude
      });
      
      const response = await api.post(`/customers/${currentUser.user_id}/request-ride`, { 
        destination: destinationLocation.location,
        // Include coordinates in the request
        pickup_lat: pickupLocation.latitude,
        pickup_lng: pickupLocation.longitude,
        destination_lat: destinationLocation.latitude,
        destination_lng: destinationLocation.longitude
      });
      
      console.log("Ride booking response:", response.data);
      
      setMessage({ 
        type: 'success', 
        text: `Ride booked successfully! A driver is on their way. Ride ID: ${response.data.ride_id}`
      });
    } catch (error) {
      console.error("Error booking ride:", error);
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.detail || 'Failed to request a ride. Please try again.' 
      });
    } finally {
      setSearchingDrivers(false);
    }
  };

  const onPickupMarkerClick = useCallback(() => {
    setShowPickupInfoWindow(true);
    setShowDestinationInfoWindow(false);
  }, []);

  const onDestinationMarkerClick = useCallback(() => {
    setShowDestinationInfoWindow(true);
    setShowPickupInfoWindow(false);
  }, []);

  const closeInfoWindows = useCallback(() => {
    setShowPickupInfoWindow(false);
    setShowDestinationInfoWindow(false);
  }, []);

  const mapCenter = useMemo(() => {
    if (directions) {
      // If we have directions, center the map at the midpoint of the route
      const bounds = new window.google.maps.LatLngBounds();
      directions.routes[0].overview_path.forEach(point => {
        bounds.extend(point);
      });
      const center = bounds.getCenter();
      return { lat: center.lat(), lng: center.lng() };
    } else if (pickupLocation && destinationLocation) {
      // If we have both pickup and destination, center between them
      return {
        lat: (Number(pickupLocation.latitude) + Number(destinationLocation.latitude)) / 2,
        lng: (Number(pickupLocation.longitude) + Number(destinationLocation.longitude)) / 2
      };
    } else if (pickupLocation) {
      // Center on pickup location
      return { lat: Number(pickupLocation.latitude), lng: Number(pickupLocation.longitude) };
    }
    return defaultCenter;
  }, [pickupLocation, destinationLocation, directions, defaultCenter]);

  // Calculate map zoom level
  const mapZoom = useMemo(() => {
    if (directions || (pickupLocation && destinationLocation)) {
      return 12;  // Zoom out a bit when showing both points
    }
    return 14;    // Default zoom for single location
  }, [pickupLocation, destinationLocation, directions]);

  return (
    <>
      <Navbar />
      <Container className="mt-4">
        <h1>Customer Dashboard</h1>
        <p>Welcome, {currentUser?.name}! Book your ride here.</p>
        
        {message && <Alert variant={message.type}>{message.text}</Alert>}
        
        <Row className="mt-4">
          <Col md={6}>
            <Card>
              <Card.Header>Your Current Location</Card.Header>
              <Card.Body>
                <Row>
                  <Col>
                    {loading ? (
                      <div className="text-center">
                        <Spinner animation="border" role="status" />
                        <p className="mt-2">Loading location data...</p>
                      </div>
                    ) : pickupLocation ? (
                      <>
                        <p><strong>Area:</strong> {pickupLocation.location || 'Unknown'}</p>
                        <p><strong>Latitude:</strong> {pickupLocation.latitude.toFixed(6) || 'N/A'}</p>
                        <p><strong>Longitude:</strong> {pickupLocation.longitude.toFixed(6) || 'N/A'}</p>
                      </>
                    ) : (
                      <p>Location data not available. Please refresh your location.</p>
                    )}
                  </Col>
                </Row>
                <Button 
                  variant="primary" 
                  onClick={handleRefreshLocation}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner 
                        as="span" 
                        animation="border" 
                        size="sm" 
                        role="status" 
                        aria-hidden="true" 
                      />
                      <span className="ms-2">Loading...</span>
                    </>
                  ) : (
                    'Refresh Location'
                  )}
                </Button>
              </Card.Body>
            </Card>
            
            <Card className="mt-4">
              <Card.Header>Book a Ride</Card.Header>
              <Card.Body>
                <Form onSubmit={handleSearchDestination} className="mb-3">
                  <Form.Group>
                    <Form.Label>Enter your destination</Form.Label>
                    <Form.Control 
                      type="text" 
                      value={destinationInput}
                      onChange={(e) => setDestinationInput(e.target.value)}
                      placeholder="Where to?"
                      required
                    />
                  </Form.Group>
                  <Button 
                    variant="primary" 
                    type="submit" 
                    className="mt-3"
                    disabled={geocoding || !pickupLocation}
                  >
                    {geocoding ? (
                      <>
                        <Spinner 
                          as="span" 
                          animation="border" 
                          size="sm" 
                          role="status" 
                          aria-hidden="true" 
                        />
                        <span className="ms-2">Searching...</span>
                      </>
                    ) : (
                      'Search Destination'
                    )}
                  </Button>
                </Form>

                {destinationLocation && (
                  <div className="my-3 p-3 bg-light rounded">
                    <h6>Selected Destination:</h6>
                    <p className="mb-0">{destinationLocation.location}</p>
                  </div>
                )}

                <Button 
                  variant="success" 
                  onClick={handleBookRide}
                  className="w-100 mt-3"
                  disabled={searchingDrivers || !pickupLocation || !destinationLocation}
                >
                  {searchingDrivers ? (
                    <>
                      <Spinner 
                        as="span" 
                        animation="border" 
                        size="sm" 
                        role="status" 
                        aria-hidden="true" 
                      />
                      <span className="ms-2">Searching Drivers...</span>
                    </>
                  ) : (
                    'Book Ride'
                  )}
                </Button>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6}>
            <Card style={{ height: '400px' }} className="overflow-hidden">
              {loadError ? (
                <Card.Body className="d-flex flex-column align-items-center justify-content-center">
                  <p className="text-danger mb-3">Failed to load map: {loadError.message}</p>
                  <Button variant="primary" onClick={() => window.location.reload()}>
                    Reload Page
                  </Button>
                </Card.Body>
              ) : !isLoaded ? (
                <Card.Body className="d-flex justify-content-center align-items-center h-100">
                  <Spinner animation="border" />
                </Card.Body>
              ) : (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={mapZoom}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false
                  }}
                >
                  {/* Render pickup location marker */}
                  {pickupLocation && pickupLocation.latitude && pickupLocation.longitude && (
                    <Marker
                      position={{
                        lat: Number(pickupLocation.latitude),
                        lng: Number(pickupLocation.longitude)
                      }}
                      onClick={onPickupMarkerClick}
                      // Use green pin for pickup location
                      icon={{
                        url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
                      }}
                    >
                      {showPickupInfoWindow && (
                        <InfoWindow
                          position={{
                            lat: Number(pickupLocation.latitude),
                            lng: Number(pickupLocation.longitude)
                          }}
                          onCloseClick={closeInfoWindows}
                        >
                          <div>
                            <h6>Pickup Location</h6>
                            <p>{pickupLocation.location || 'Your Current Position'}</p>
                          </div>
                        </InfoWindow>
                      )}
                    </Marker>
                  )}
                  
                  {/* Render destination location marker */}
                  {destinationLocation && destinationLocation.latitude && destinationLocation.longitude && (
                    <Marker
                      position={{
                        lat: Number(destinationLocation.latitude),
                        lng: Number(destinationLocation.longitude)
                      }}
                      onClick={onDestinationMarkerClick}
                      // Use red pin for destination
                      icon={{
                        url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
                      }}
                    >
                      {showDestinationInfoWindow && (
                        <InfoWindow
                          position={{
                            lat: Number(destinationLocation.latitude),
                            lng: Number(destinationLocation.longitude)
                          }}
                          onCloseClick={closeInfoWindows}
                        >
                          <div>
                            <h6>Destination</h6>
                            <p>{destinationLocation.location}</p>
                          </div>
                        </InfoWindow>
                      )}
                    </Marker>
                  )}
                  
                  {/* Render directions if available */}
                  {directions && (
                    <DirectionsRenderer
                      directions={directions}
                      options={{
                        suppressMarkers: true,
                        polylineOptions: {
                          strokeColor: '#1976D2',
                          strokeWeight: 5
                        }
                      }}
                    />
                  )}
                </GoogleMap>
              )}
              
              {(loading || geocoding) && isLoaded && (
                <div 
                  className="position-absolute d-flex justify-content-center align-items-center bg-white bg-opacity-75" 
                  style={{ top: 0, left: 0, right: 0, bottom: 0 }}
                >
                  <Spinner animation="border" />
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default CustomerDashboard;
