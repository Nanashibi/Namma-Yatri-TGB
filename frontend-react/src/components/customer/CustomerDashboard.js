import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Tabs, Tab, Modal, ListGroup, Badge } from 'react-bootstrap';
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
  const [pickupInput, setPickupInput] = useState('');  // New state for manual pickup input
  const [destinationInput, setDestinationInput] = useState('');
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchingDrivers, setSearchingDrivers] = useState(false);
  const [showPickupInfoWindow, setShowPickupInfoWindow] = useState(false);
  const [showDestinationInfoWindow, setShowDestinationInfoWindow] = useState(false);
  const [directions, setDirections] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true); // To toggle between current and manual location
  
  // Prebooking states
  const [activeTab, setActiveTab] = useState('book-now');
  const [prebookWard, setPrebookWard] = useState('');
  const [prebookDate, setPrebookDate] = useState('');
  const [prebookTime, setPrebookTime] = useState('');
  const [prebooking, setPrebooking] = useState(false);
  const [prebookedRides, setPrebookedRides] = useState([]);
  const [showPrebookModal, setShowPrebookModal] = useState(false);
  const [selectedPrebooking, setSelectedPrebooking] = useState(null);
  
  const availableWards = [
    'Koramangala', 
    'Indiranagar', 
    'Whitefield', 
    'Electronic City', 
    'HSR Layout', 
    'JP Nagar', 
    'Marathahalli', 
    'Jayanagar', 
    'BTM Layout', 
    'Yelahanka'
  ];

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

  // Fetch prebooked rides
  const fetchPrebookedRides = useCallback(async () => {
    if (!currentUser || !currentUser.user_id) return;
    
    try {
      const response = await api.get(`/prebooking/customer/${currentUser.user_id}/rides`);
      setPrebookedRides(response.data.prebooked_rides || []);
    } catch (error) {
      console.error('Error fetching prebooked rides:', error);
    }
  }, [currentUser]);

  // Initial data loading
  useEffect(() => {
    if (currentUser) {
      fetchCustomerLocation();
      fetchPrebookedRides();
    }
  }, [currentUser, fetchCustomerLocation, fetchPrebookedRides]);

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

  // Function to geocode an address (for both pickup and destination)
  const geocodeAddress = useCallback((address, isPickup = false) => {
    if (!isLoaded || !window.google) return;
    
    const geocoder = new window.google.maps.Geocoder();
    setGeocoding(true);
    
    geocoder.geocode({ address: address + ', Bengaluru, Karnataka, India' }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        const formattedLocation = {
          location: results[0].formatted_address,
          latitude: location.lat(),
          longitude: location.lng()
        };
        
        if (isPickup) {
          setPickupLocation(formattedLocation);
          // When updating pickup manually, set useCurrentLocation to false
          setUseCurrentLocation(false);
        } else {
          setDestinationLocation(formattedLocation);
        }
        
        // If we have both pickup and destination, calculate directions
        if ((isPickup && destinationLocation) || (!isPickup && pickupLocation)) {
          const origin = isPickup ? formattedLocation : pickupLocation;
          const destination = isPickup ? destinationLocation : formattedLocation;
          
          calculateDirections(
            { lat: origin.latitude, lng: origin.longitude },
            { lat: destination.latitude, lng: destination.longitude }
          );
        }
      } else {
        console.error('Geocoding failed:', status);
        setMessage({ type: 'warning', text: `Could not find ${isPickup ? 'pickup' : 'destination'} location, please try again` });
      }
      setGeocoding(false);
    });
  }, [isLoaded, pickupLocation, destinationLocation]);

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

  const handleSearchPickup = (e) => {
    e.preventDefault();
    
    if (!pickupInput) {
      setMessage({ type: 'warning', text: 'Please enter a pickup location' });
      return;
    }
    
    // Geocode the pickup address to get coordinates
    geocodeAddress(pickupInput, true);
  };

  const handleSearchDestination = (e) => {
    e.preventDefault();
    
    if (!destinationInput) {
      setMessage({ type: 'warning', text: 'Please enter a destination' });
      return;
    }
    
    // Geocode the destination address to get coordinates
    geocodeAddress(destinationInput, false);
  };

  const handleBookRide = async (e) => {
    e.preventDefault();
    
    if (!pickupLocation) {
      setMessage({ type: 'warning', text: 'Please set a pickup location first' });
      return;
    }
    
    if (!destinationLocation) {
      setMessage({ type: 'warning', text: 'Please search for a destination first' });
      return;
    }
    
    setSearchingDrivers(true);
    try {
      console.log("Booking ride with data:", {
        destination: destinationLocation.location,
        pickup: pickupLocation.location,
        pickup_lat: pickupLocation.latitude,
        pickup_lng: pickupLocation.longitude,
        destination_lat: destinationLocation.latitude,
        destination_lng: destinationLocation.longitude
      });
      
      const response = await api.post(`/customers/${currentUser.user_id}/request-ride`, { 
        destination: destinationLocation.location,
        pickup: pickupLocation.location,
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

  // Handle prebooking submission
  const handlePrebookRide = async (e) => {
    e.preventDefault();
    
    if (!prebookWard) {
      setMessage({ type: 'warning', text: 'Please select a pickup ward' });
      return;
    }
    
    if (!prebookDate || !prebookTime) {
      setMessage({ type: 'warning', text: 'Please select both date and time for prebooking' });
      return;
    }
    
    // Validate that the selected time is in the future
    const selectedDateTime = new Date(`${prebookDate}T${prebookTime}`);
    const now = new Date();
    
    if (selectedDateTime <= now) {
      setMessage({ type: 'warning', text: 'Prebooking time must be in the future' });
      return;
    }
    
    setPrebooking(true);
    try {
      const pickup_time = `${prebookDate}T${prebookTime}`;
      console.log("Prebooking ride with data:", {
        customer_id: currentUser.user_id,
        ward: prebookWard,
        pickup_time: pickup_time
      });
      
      const response = await api.post('/prebooking/prebook/', {
        customer_id: currentUser.user_id,
        ward: prebookWard,
        pickup_time: pickup_time
      });
      
      console.log("Prebooking response:", response.data);
      
      setMessage({ 
        type: 'success', 
        text: `Ride prebooked successfully! Your ride will be ready at the scheduled time.`
      });
      
      // Reset form
      setPrebookWard('');
      setPrebookDate('');
      setPrebookTime('');
      
      // Refresh the prebooking list
      fetchPrebookedRides();
    } catch (error) {
      console.error("Error prebooking ride:", error);
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.detail || 'Failed to prebook a ride. Please try again.' 
      });
    } finally {
      setPrebooking(false);
    }
  };

  // Handle prebooking cancellation
  const handleCancelPrebook = async (prebookId) => {
    try {
      const response = await api.post('/prebooking/cancel_prebook/', {
        customer_id: currentUser.user_id,
        ride_id: prebookId
      });
      
      console.log("Cancel prebooking response:", response.data);
      
      setMessage({ type: 'info', text: response.data.message });
      
      // Refresh the prebooking list
      fetchPrebookedRides();
      
      // Close the modal if open
      setShowPrebookModal(false);
    } catch (error) {
      console.error("Error cancelling prebooking:", error);
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.detail || 'Failed to cancel prebooking. Please try again.' 
      });
    }
  };

  const handlePrebookingClick = (prebooking) => {
    setSelectedPrebooking(prebooking);
    setShowPrebookModal(true);
  };

  // Toggle between using current location and manual input
  const handleLocationToggle = () => {
    if (!useCurrentLocation) {
      // If switching to current location, fetch it
      fetchCustomerLocation();
    }
    setUseCurrentLocation(!useCurrentLocation);
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

  // Get min date for prebooking (today's date)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <>
      <Navbar />
      <Container className="mt-4">
        <h1>Customer Dashboard</h1>
        <p>Welcome, {currentUser?.name}! Book your ride here.</p>
        
        {message && <Alert variant={message.type} onClose={() => setMessage(null)} dismissible>{message.text}</Alert>}
        
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-3"
        >
          <Tab eventKey="book-now" title="Book Now">
            <Row className="mt-4">
              <Col md={6}>
                <Card>
                  <Card.Header>
                    <div className="d-flex justify-content-between align-items-center">
                      <span>Your Location</span>
                      <Form.Check 
                        type="switch"
                        id="location-toggle"
                        label={useCurrentLocation ? "Using Current Location" : "Enter Manually"}
                        checked={useCurrentLocation}
                        onChange={handleLocationToggle}
                        className="mb-0"
                      />
                    </div>
                  </Card.Header>
                  <Card.Body>
                    {useCurrentLocation ? (
                      // Show current location data and refresh button
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
                        <Button 
                          variant="primary" 
                          onClick={handleRefreshLocation}
                          disabled={loading}
                          className="mt-2"
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
                      </Row>
                    ) : (
                      // Show manual pickup location input form
                      <Form onSubmit={handleSearchPickup}>
                        <Form.Group>
                          <Form.Label>Enter your pickup location</Form.Label>
                          <Form.Control 
                            type="text" 
                            value={pickupInput}
                            onChange={(e) => setPickupInput(e.target.value)}
                            placeholder="Enter pickup location"
                            required
                          />
                        </Form.Group>
                        <Button 
                          variant="primary" 
                          type="submit" 
                          className="mt-3"
                          disabled={geocoding}
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
                            'Set Pickup Location'
                          )}
                        </Button>
                      </Form>
                    )}
                    
                    {!useCurrentLocation && pickupLocation && (
                      <div className="my-3 p-3 bg-light rounded">
                        <h6>Selected Pickup Location:</h6>
                        <p className="mb-0">{pickupLocation.location}</p>
                      </div>
                    )}
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
                        disabled={geocoding}
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
          </Tab>
          
          <Tab eventKey="prebook" title="Prebook Ride">
            <Row className="mt-4">
              <Col md={6}>
                <Card>
                  <Card.Header>Schedule a Ride</Card.Header>
                  <Card.Body>
                    <Form onSubmit={handlePrebookRide}>
                      <Form.Group className="mb-3">
                        <Form.Label>Select Ward/Area</Form.Label>
                        <Form.Select 
                          value={prebookWard}
                          onChange={(e) => setPrebookWard(e.target.value)}
                          required
                        >
                          <option value="">Select a pickup area</option>
                          {availableWards.map((ward, index) => (
                            <option key={index} value={ward}>{ward}</option>
                          ))}
                        </Form.Select>
                        <Form.Text className="text-muted">
                          Select the area where you'll be picked up
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Pickup Date</Form.Label>
                        <Form.Control
                          type="date"
                          value={prebookDate}
                          onChange={(e) => setPrebookDate(e.target.value)}
                          min={getMinDate()}
                          required
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Pickup Time</Form.Label>
                        <Form.Control
                          type="time"
                          value={prebookTime}
                          onChange={(e) => setPrebookTime(e.target.value)}
                          required
                        />
                      </Form.Group>
                      
                      <Button 
                        variant="success" 
                        type="submit"
                        className="w-100"
                        disabled={prebooking}
                      >
                        {prebooking ? (
                          <>
                            <Spinner 
                              as="span" 
                              animation="border" 
                              size="sm" 
                              role="status" 
                              aria-hidden="true" 
                            />
                            <span className="ms-2">Processing...</span>
                          </>
                        ) : (
                          'Prebook Ride'
                        )}
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={6}>
                <Card>
                  <Card.Header>Your Prebooked Rides</Card.Header>
                  <Card.Body>
                    {prebookedRides.length > 0 ? (
                      <ListGroup variant="flush">
                        {prebookedRides.map((ride) => (
                          <ListGroup.Item 
                            key={ride.ride_id}
                            action
                            onClick={() => handlePrebookingClick(ride)}
                            className="d-flex justify-content-between align-items-center"
                          >
                            <div>
                              <div className="fw-bold">{ride.ward}</div>
                              <div className="text-muted small">
                                {new Date(ride.pickup_time).toLocaleString()}
                              </div>
                            </div>
                            <Badge bg={
                              ride.status === 'pending' ? 'warning' :
                              ride.status === 'accepted' ? 'success' :
                              ride.status === 'cancelled' ? 'danger' : 'info'
                            }>
                              {ride.status}
                            </Badge>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    ) : (
                      <p className="text-center">You don't have any prebooked rides yet.</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>
        </Tabs>
        
        {/* Prebooking Details Modal */}
        <Modal 
          show={showPrebookModal} 
          onHide={() => setShowPrebookModal(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Prebooked Ride Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedPrebooking && (
              <>
                <p><strong>Pickup Area:</strong> {selectedPrebooking.ward}</p>
                <p><strong>Pickup Time:</strong> {new Date(selectedPrebooking.pickup_time).toLocaleString()}</p>
                <p>
                  <strong>Status:</strong>{' '}
                  <Badge bg={
                    selectedPrebooking.status === 'pending' ? 'warning' :
                    selectedPrebooking.status === 'accepted' ? 'success' :
                    selectedPrebooking.status === 'cancelled' ? 'danger' : 'info'
                  }>
                    {selectedPrebooking.status}
                  </Badge>
                </p>
                {selectedPrebooking.driver_id && (
                  <p><strong>Driver:</strong> {selectedPrebooking.driver_name || `ID: ${selectedPrebooking.driver_id}`}</p>
                )}
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPrebookModal(false)}>
              Close
            </Button>
            {selectedPrebooking && selectedPrebooking.status === 'pending' && (
              <Button 
                variant="danger" 
                onClick={() => handleCancelPrebook(selectedPrebooking.ride_id)}
              >
                Cancel Prebooking
              </Button>
            )}
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
};

export default CustomerDashboard;
