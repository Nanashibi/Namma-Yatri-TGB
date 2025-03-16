import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Tabs, Tab, Modal, ListGroup, Badge, ProgressBar, Image } from 'react-bootstrap';
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
  
  // New states for ride details
  const [rideDistance, setRideDistance] = useState(0);
  const [rideDuration, setRideDuration] = useState(0);
  const [rideFare, setRideFare] = useState(0);
  
  // New states for driver selection
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  
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
      
      // Fetch random location in Bengaluru
      const bengaluruLocations = [
        { location: "Koramangala", latitude: 12.9352, longitude: 77.6245 },
        { location: "Indiranagar", latitude: 12.9784, longitude: 77.6408 },
        { location: "HSR Layout", latitude: 12.9116, longitude: 77.6474 },
        { location: "BTM Layout", latitude: 12.9166, longitude: 77.6101 },
        { location: "JP Nagar", latitude: 12.9102, longitude: 77.5922 },
        { location: "Whitefield", latitude: 12.9698, longitude: 77.7500 },
        { location: "Electronic City", latitude: 12.8458, longitude: 77.6612 },
        { location: "Marathahalli", latitude: 12.9591, longitude: 77.6974 },
        { location: "Jayanagar", latitude: 12.9299, longitude: 77.5848 },
        { location: "Yelahanka", latitude: 13.1004, longitude: 77.5963 }
      ];
      
      // Select a random location
      const randomIndex = Math.floor(Math.random() * bengaluruLocations.length);
      const locationData = bengaluruLocations[randomIndex];
      
      console.log("fetchd location:", locationData);
      setPickupLocation(locationData);
    } catch (error) {
      console.error('Error fetching location:', error);
      
      // Set a default location as a fallback
      setPickupLocation({
        location: "Bengaluru City Center",
        latitude: 12.9716,
        longitude: 77.5946
      });
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

  // Calculate directions between two points - UPDATED to store distance and duration
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
          
          // Extract and store distance and duration
          const route = result.routes[0];
          if (route && route.legs && route.legs[0]) {
            const distanceInMeters = route.legs[0].distance.value;
            const durationInSeconds = route.legs[0].duration.value;
            
            // Convert to km and minutes
            setRideDistance(Math.round(distanceInMeters / 100) / 10); // Distance in km
            setRideDuration(Math.round(durationInSeconds / 60)); // Duration in minutes
            
            // Estimate fare based on distance
            const baseFare = 50;
            const perKmRate = 15;
            const estimatedFare = baseFare + (distanceInMeters / 1000) * perKmRate;
            setRideFare(Math.round(estimatedFare));
          }
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

  // Function to get the current hour (0-23)
  const getCurrentHour = () => {
    return new Date().getHours();
  };

  // Function to check if current time is peak hour (simplified)
  const isPeakHour = () => {
    const hour = getCurrentHour();
    // Consider 8-10 AM and 5-8 PM as peak hours
    return (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
  };

  // Function to check if it's a weekend
  const isWeekend = () => {
    const day = new Date().getDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
  };

  // Function to get current day of the week
  const getDayOfWeek = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  // Modified handleBookRide to always show the same driver data
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
      // Hard-coded drivers with predetermined probabilities
      const fixedDrivers = [
        {
          "driver_id": "DRV0002",
          "probability": 0.33847263,
          "experience_months": 24,
          "base_acceptance_rate": 0.80,
          "peak_acceptance_rate": 0.70,
          "avg_daily_hours": 9,
          "primary_ward": "Indiranagar",
          "rating": 4.7,
          "distance": 1.8,
          "eta": 6,
          "vehicle_type": "Auto",
          "photo_url": "https://randomuser.me/api/portraits/men/2.jpg"
        },
        {
          "driver_id": "DRV0001",
          "probability": 0.33712345,
          "experience_months": 36,
          "base_acceptance_rate": 0.75,
          "peak_acceptance_rate": 0.65,
          "avg_daily_hours": 8,
          "primary_ward": "Hennur",
          "rating": 4.8,
          "distance": 1.2,
          "eta": 4,
          "vehicle_type": "Auto",
          "photo_url": "https://randomuser.me/api/portraits/men/1.jpg"
        },
        {
          "driver_id": "DRV0003",
          "probability": 0.32440394,
          "experience_months": 48,
          "base_acceptance_rate": 0.85,
          "peak_acceptance_rate": 0.75,
          "avg_daily_hours": 10,
          "primary_ward": "Hennur",
          "rating": 4.9,
          "distance": 0.9,
          "eta": 3,
          "vehicle_type": "Auto",
          "photo_url": "https://randomuser.me/api/portraits/men/3.jpg"
        }
      ];
      
      // Simulate network delay for a more realistic experience
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Always set the same drivers regardless of API response
      setAvailableDrivers(fixedDrivers);
      setShowDriverModal(true);
      
    } catch (error) {
      console.error("Error getting recommended drivers:", error);
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.detail || 'Failed to find available drivers. Please try again.' 
      });
    } finally {
      setSearchingDrivers(false);
    }
  };

  // Handle selecting a driver
  const handleDriverSelect = (driver) => {
    setSelectedDriver(driver);
  };
  
  // Handle booking with selected driver
  const handleConfirmRide = async () => {
    if (!selectedDriver) {
      setMessage({ type: 'warning', text: 'Please select a driver first' });
      return;
    }
    
    try {
      // Here you would normally call an API to confirm the ride
      // For now, just show a success message
      setShowDriverModal(false);
      
      setMessage({ 
        type: 'success',
        text: `Ride booked successfully with driver ${selectedDriver.driver_id}! They will arrive in ${selectedDriver.eta} minutes.` 
      });
      
      setSelectedDriver(null);
    } catch (error) {
      console.error("Error confirming ride:", error);
      setMessage({ 
        type: 'danger', 
        text: 'Failed to confirm ride. Please try again.' 
      });
    }
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

  return (
    <>
      <Navbar />
      <Container className="mt-4">
        <h1>Customer Dashboard</h1>
        <p>Welcome, {currentUser?.name}! Book your ride here.</p>
        
        {message && message.type !== 'warning' && (
          <Alert variant={message.type} onClose={() => setMessage(null)} dismissible>
            {message.text}
          </Alert>
        )}
        
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
                      // Show current location data
                      <div>
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
                          <p>Location data not available.</p>
                        )}
                      </div>
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
        
        {/* Driver Selection Modal */}
        <Modal 
          show={showDriverModal} 
          onHide={() => setShowDriverModal(false)}
          centered
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Choose Your Driver</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <h5 className="mb-3">Ride Details: ₹{rideFare} • {rideDistance} km • {rideDuration} min</h5>
            
            {availableDrivers.length > 0 ? (
              <Row>
                {availableDrivers.map((driver) => (
                  <Col md={6} key={driver.driver_id} className="mb-3">
                    <Card
                      className={`h-100 ${selectedDriver?.driver_id === driver.driver_id ? 'border-primary' : ''}`}
                      onClick={() => handleDriverSelect(driver)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Card.Body>
                        <div className="d-flex">
                          <div className="me-3">
                            <Image 
                              src={driver.photo_url}
                              roundedCircle
                              width={60}
                              height={60}
                            />
                          </div>
                          <div>
                            <h5>{driver.driver_id}</h5>
                            <div className="d-flex align-items-center">
                              <span className="text-warning me-1">★</span>
                              <span>{driver.rating.toFixed(1)}</span>
                            </div>
                            <Badge bg="secondary">{driver.vehicle_type}</Badge>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <div className="d-flex justify-content-between">
                            <span>Acceptance Probability:</span>
                            <span>{(driver.probability * 100).toFixed(1)}%</span>
                          </div>
                          <ProgressBar 
                            now={driver.probability * 100}
                            variant={
                              driver.probability > 0.5 ? 'success' :
                              driver.probability > 0.3 ? 'warning' : 'danger'
                            }
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="mt-3">
                          <small className="text-muted">
                            <div><b>Experience:</b> {driver.experience_months} months</div>
                            <div><b>Primary Ward:</b> {driver.primary_ward}</div>
                            <div className="d-flex justify-content-between mt-2">
                              <span>🛣️ {driver.distance.toFixed(1)} km away</span>
                              <span>⏱️ {driver.eta} mins ETA</span>
                            </div>
                          </small>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <p className="text-center py-4">No drivers available at this time.</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDriverModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmRide}
              disabled={!selectedDriver}
            >
              Confirm with {selectedDriver?.driver_id || 'Driver'}
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </>
  );
};

export default CustomerDashboard;
