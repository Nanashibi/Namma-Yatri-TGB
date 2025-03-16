import React, { useState, useEffect, useContext } from "react";
import { Container, Row, Col, Card, Table, Badge, Form, Button, Spinner, ListGroup, Modal, Alert } from "react-bootstrap";
import { AuthContext } from "../../contexts/AuthContext";
import Navbar from "../common/Navbar";
import api from "../../utils/api";

const DriverDashboard = () => {
    const { currentUser } = useContext(AuthContext);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [driverData, setDriverData] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [prebookedRides, setPrebookedRides] = useState([]);
    const [pendingRides, setPendingRides] = useState([]);
    const [selectedRide, setSelectedRide] = useState(null);
    const [showRideModal, setShowRideModal] = useState(false);
    const [processingRideAction, setProcessingRideAction] = useState(false);
    const [alertMessage, setAlertMessage] = useState(null);
    const [rideType, setRideType] = useState("");

    // Function to load available rides when driver is online
    const loadAvailableRides = () => {
        // Set mock prebooked rides
        setPrebookedRides([
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
            },
            { 
                ride_id: "PB12347", 
                ward: "HSR Layout", 
                pickup_time: new Date(Date.now() + 10800000).toISOString(), // 3 hours from now
                estimated_fare: 180,
                customer_name: "Vikram Iyer", 
                customer_rating: 4.7
            }
        ]);
        
        // Set mock pending rides
        setPendingRides([
            {
                ride_id: "R98765",
                customer_name: "Ananya Desai",
                pickup: "HSR Layout",
                destination: "Electronic City",
                fare: 300,
                distance: "12.4 km",
                customer_rating: 4.9
            },
            {
                ride_id: "R98766",
                customer_name: "Neha Reddy",
                pickup: "Indiranagar",
                destination: "MG Road",
                fare: 180,
                distance: "5.8 km",
                customer_rating: 4.6
            }
        ]);
    };

    useEffect(() => {
        if (!currentUser) {
            setDriverData({ driver_id: "N/A", coins: 0, tier: "Bronze", rank: "N/A" });
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Get driver profile data (availability status)
                try {
                    const driverResponse = await api.get(`/drivers/${currentUser.user_id}/profile`);
                    const driverProfile = driverResponse.data;
                    setIsOnline(driverProfile.is_available);
                    
                    // If driver is online, load available rides
                    if (driverProfile.is_available) {
                        loadAvailableRides();
                    }
                } catch (error) {
                    console.error("Error fetching driver profile:", error);
                    setIsOnline(false);
                }
                
                // Use real data for leaderboard
                const fetchLeaderboard = async () => {
                    try {
                        const response = await fetch("http://localhost:5000/api/gamification/driver");
                        if (!response.ok) throw new Error(`API error: ${response.status}`);

                        const data = await response.json();
                        if (data && data.leaderboard) {
                            setLeaderboard(data.leaderboard.slice(0, 10)); // Limit to top 10
                            const foundDriver = data.leaderboard.find(
                                (d) => d.driver_id === currentUser.user_id
                            );
                            setDriverData(
                                foundDriver || { driver_id: currentUser.user_id, coins: 0, tier: "Bronze", rank: "N/A" }
                            );
                        }
                    } catch (error) {
                        console.error("Error fetching leaderboard:", error);
                        setLeaderboard([]);
                        setDriverData({ driver_id: currentUser.user_id, coins: 0, tier: "Bronze", rank: "N/A" });
                    }
                };
                
                await fetchLeaderboard();
                
            } catch (error) {
                console.error("Error fetching driver data:", error);
                setDriverData({ driver_id: currentUser.user_id, coins: 0, tier: "Bronze", rank: "N/A" });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser]);

    const handleToggleOnline = async () => {
        try {
            setUpdatingStatus(true);
            const newStatus = !isOnline;
            
            // Update the state immediately for better UI responsiveness
            setIsOnline(newStatus);
            
            // Show success message
            setAlertMessage({
                type: "success",
                text: `You are now ${newStatus ? "online" : "offline"}.`
            });
            
            // Update rides based on new status
            if (newStatus) {
                // Load available rides when going online
                loadAvailableRides();
            } else {
                // Clear rides when going offline
                setPrebookedRides([]);
                setPendingRides([]);
            }
            
            // In a real application, we would make an API call here
            // For mock implementation, we've already updated the UI state
            
        } catch (error) {
            console.error("Error toggling availability:", error);

            const newStatus = !isOnline;            
            // Revert the state change if there was an error
            setIsOnline(!newStatus);
            
            setAlertMessage({
                type: "danger",
                text: "Failed to update your availability. Please try again."
            });
        } finally {
            setUpdatingStatus(false);
        }
    };
    
    const handleViewRideDetails = (ride, type) => {
        setSelectedRide(ride);
        setRideType(type);
        setShowRideModal(true);
    };

    const handleRideAction = async (action) => {
        try {
            setProcessingRideAction(true);
            
            if (rideType === "prebook") {
                // For prebooked rides - just update local state
                if (action === "accept") {
                    // Remove the selected ride from the prebooked rides
                    setPrebookedRides(prebookedRides.filter(ride => ride.ride_id !== selectedRide.ride_id));
                    
                    setAlertMessage({
                        type: "success",
                        text: "Prebooked ride accepted successfully!"
                    });
                } else {
                    // Remove the selected ride from the prebooked rides
                    setPrebookedRides(prebookedRides.filter(ride => ride.ride_id !== selectedRide.ride_id));
                    
                    setAlertMessage({
                        type: "info",
                        text: "Prebooked ride declined."
                    });
                }
            } else {
                // For regular rides - just update local state
                if (action === "accept") {
                    // Remove the selected ride from the pending rides
                    setPendingRides(pendingRides.filter(ride => ride.ride_id !== selectedRide.ride_id));
                    
                    setAlertMessage({
                        type: "success",
                        text: "Ride accepted successfully!"
                    });
                } else {
                    // Remove the selected ride from the pending rides
                    setPendingRides(pendingRides.filter(ride => ride.ride_id !== selectedRide.ride_id));
                    
                    setAlertMessage({
                        type: "info",
                        text: "Ride declined."
                    });
                }
            }
            
            setShowRideModal(false);
        } catch (error) {
            console.error(`Error ${action}ing ride:`, error);
            setAlertMessage({
                type: "danger",
                text: `Failed to ${action} the ride. Please try again.`
            });
        } finally {
            setProcessingRideAction(false);
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <Container className="d-flex justify-content-center align-items-center" style={{ height: "70vh" }}>
                    <Spinner animation="border" />
                </Container>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <Container className="mt-4">
                {alertMessage && (
                    <Alert 
                        variant={alertMessage.type} 
                        onClose={() => setAlertMessage(null)} 
                        dismissible
                    >
                        {alertMessage.text}
                    </Alert>
                )}
                
                <Row>
                    <Col md={4}>
                        <Card className="shadow mb-4">
                            <Card.Body>
                                <h4>Welcome, Driver {currentUser?.name}</h4>
                                <p><strong>Rank:</strong> {driverData?.rank}</p>
                                <p>
                                    <strong>Tier:</strong>{" "}
                                    <Badge bg={
                                        driverData?.tier === "Platinum" ? "primary" :
                                        driverData?.tier === "Gold" ? "warning" :
                                        driverData?.tier === "Silver" ? "secondary" :
                                        "" // No built-in bronze color, using inline style
                                    } style={driverData?.tier === "Bronze" ? { backgroundColor: "#cd7f32" } : {}}>
                                        {driverData?.tier}
                                    </Badge>
                                </p>
                                <p><strong>Coins:</strong> {driverData?.coins}</p>
                                
                                <div className="d-grid gap-2 mt-4">
                                    <Form.Check 
                                        type="switch"
                                        id="online-status-switch"
                                        label={isOnline ? "You are Online" : "You are Offline"}
                                        checked={isOnline}
                                        onChange={handleToggleOnline}
                                        disabled={updatingStatus}
                                    />
                                    <Button 
                                        variant={isOnline ? "success" : "secondary"}
                                        disabled={updatingStatus}
                                        onClick={handleToggleOnline}
                                        className="mt-2"
                                    >
                                        {updatingStatus ? (
                                            <>
                                                <Spinner 
                                                    as="span" 
                                                    animation="border" 
                                                    size="sm" 
                                                    role="status"
                                                    aria-hidden="true" 
                                                />
                                                <span className="ms-2">Updating...</span>
                                            </>
                                        ) : (
                                            isOnline ? "Go Offline" : "Go Online"
                                        )}
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col md={8}>
                        <Card className="shadow mb-4">
                            <Card.Header>
                                <h5>Pending Ride Requests</h5>
                            </Card.Header>
                            <Card.Body>
                                {isOnline ? (
                                    pendingRides.length > 0 ? (
                                        <ListGroup variant="flush">
                                            {pendingRides.map((ride) => (
                                                <ListGroup.Item 
                                                    key={ride.ride_id} 
                                                    action
                                                    onClick={() => handleViewRideDetails(ride, "regular")}
                                                >
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <h6>{ride.pickup} → {ride.destination}</h6>
                                                            <small className="text-muted">
                                                                {ride.distance} • ₹{ride.fare}
                                                            </small>
                                                        </div>
                                                        <Badge bg="primary">New</Badge>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    ) : (
                                        <p className="text-center">No pending ride requests at the moment.</p>
                                    )
                                ) : (
                                    <p className="text-center text-muted">
                                        You need to be online to see pending ride requests.
                                    </p>
                                )}
                            </Card.Body>
                        </Card>

                        <Card className="shadow">
                            <Card.Header>
                                <h5>Available Prebooked Rides</h5>
                            </Card.Header>
                            <Card.Body>
                                {isOnline ? (
                                    prebookedRides.length > 0 ? (
                                        <ListGroup variant="flush">
                                            {prebookedRides.map((ride) => (
                                                <ListGroup.Item 
                                                    key={ride.ride_id} 
                                                    action
                                                    onClick={() => handleViewRideDetails(ride, "prebook")}
                                                    className="d-flex justify-content-between align-items-center"
                                                >
                                                    <div>
                                                        <h6>Ward: {ride.ward}</h6>
                                                        <small className="text-muted">
                                                            <i className="far fa-clock me-1"></i> 
                                                            {new Date(ride.pickup_time).toLocaleString()}
                                                        </small>
                                                        <div>Est. fare: ₹{ride.estimated_fare}</div>
                                                    </div>
                                                    <div>
                                                        <Badge bg="info" className="me-2">Prebooked</Badge>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    ) : (
                                        <p className="text-center">No prebooked rides available in your area.</p>
                                    )
                                ) : (
                                    <p className="text-center text-muted">
                                        You need to be online to see available prebooked rides.
                                    </p>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <Row className="mt-4">
                    <Col>
                        <Card className="shadow">
                            <Card.Header>
                                <h5>🏆 Leaderboard</h5>
                            </Card.Header>
                            <Card.Body>
                                {leaderboard.length > 0 ? (
                                    <>
                                        {/* TOP 3 DISPLAY - Fixed layout with proper visual hierarchy and much larger 3rd place */}
                                        <div className="d-flex justify-content-center mb-4">
                                            <div className="d-flex justify-content-around" style={{ width: '90%', maxWidth: '700px' }}>
                                                {leaderboard.slice(0, 3).map((_, index) => {
                                                    // Arrange in visual order: 2nd place (left), 1st place (center), 3rd place (right)
                                                    // This ordering is purely for display purposes
                                                    const positions = [1, 0, 2]; // Visual left-to-right: 2nd, 1st, 3rd
                                                    const actualPosition = positions[index]; // Map visual position to actual leaderboard position
                                                    const driver = leaderboard[actualPosition];
                                                    
                                                    // Set colors for medals
                                                    const colors = ["#C0C0C0", "#FFD700", "#cd7f32"]; // Silver, Gold, Bronze
                                                    
                                                    // Set sizes - making 3rd place significantly larger while keeping 1st place the dominant position
                                                    const sizes = ["130px", "140px", "120px"]; // Increased 3rd place to 130px
                                                    
                                                    // Set vertical positioning - 1st place should be highest
                                                    const marginTops = ["20px", "0px", "30px"]; // Adjusted margins for better visual balance
                                                    
                                                    // Font size adjustments to help fit text
                                                    const fontSizes = {
                                                        rank: ["1.5rem", "1.75rem", "1.5rem"],
                                                        id: ["0.9rem", "1rem", "0.9rem"],
                                                    };
                                                    
                                                    // Add min-width to ensure circles are wide enough
                                                    const minWidths = ["120px", "140px", "130px"];
                                                    
                                                    return (
                                                        <div key={actualPosition} className="text-center" style={{ marginTop: marginTops[index] }}>
                                                            <div
                                                                className="rounded-circle d-flex align-items-center justify-content-center shadow mx-auto"
                                                                style={{
                                                                    width: sizes[index],
                                                                    height: sizes[index],
                                                                    minWidth: minWidths[index],
                                                                    backgroundColor: colors[index],
                                                                    border: '2px solid #000',
                                                                    padding: "10px"
                                                                }}
                                                            >
                                                                <div style={{ whiteSpace: "nowrap" }}>
                                                                    <h3 className="m-0" style={{ fontSize: fontSizes.rank[index] }}>{driver.rank}</h3>
                                                                    <div className="mt-1" style={{ fontSize: fontSizes.id[index] }}>
                                                                        <strong>ID: {driver.driver_id}</strong>
                                                                    </div>
                                                                    <Badge
                                                                        bg="light"
                                                                        text="dark"
                                                                        className="mt-1"
                                                                    >
                                                                        {driver.tier}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* RANK 4-10 TABLE - Improved table styling */}
                                        {leaderboard.length > 3 && (
                                            <div className="mt-5 d-flex justify-content-center">
                                                <div style={{ maxWidth: '500px', width: '100%' }}>
                                                    <Table bordered hover className="shadow-sm">
                                                        <thead className="bg-light">
                                                            <tr>
                                                                <th className="text-center">Rank</th>
                                                                <th className="text-center">Driver ID</th>
                                                                <th className="text-center">Tier</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {leaderboard.slice(3).map((driver, index) => (
                                                                <tr key={index}>
                                                                    <td className="text-center">{driver.rank}</td>
                                                                    <td className="text-center">{driver.driver_id}</td>
                                                                    <td className="text-center">
                                                                        <Badge bg={
                                                                            driver.tier === "Platinum" ? "primary" :
                                                                            driver.tier === "Gold" ? "warning" :
                                                                            driver.tier === "Silver" ? "secondary" :
                                                                            "" 
                                                                        } style={driver.tier === "Bronze" ? { backgroundColor: "#cd7f32" } : {}}>
                                                                            {driver.tier}
                                                                        </Badge>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-center">Leaderboard data not available</p>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Ride Details Modal */}
                <Modal 
                    show={showRideModal} 
                    onHide={() => setShowRideModal(false)}
                    centered
                >
                    <Modal.Header closeButton>
                        <Modal.Title>
                            {rideType === "prebook" ? "Prebooked Ride Details" : "Ride Request Details"}
                        </Modal.Title>
                    </Modal.Header>
                    
                    <Modal.Body>
                        {selectedRide && (
                            <>
                                {rideType === "prebook" ? (
                                    // Prebooked ride details
                                    <>
                                        <p><strong>Pickup Area:</strong> {selectedRide.ward}</p>
                                        <p><strong>Pickup Time:</strong> {new Date(selectedRide.pickup_time).toLocaleString()}</p>
                                        <p><strong>Estimated Fare:</strong> ₹{selectedRide.estimated_fare}</p>
                                        <p><strong>Customer:</strong> {selectedRide.customer_name}</p>
                                        <p><strong>Customer Rating:</strong> {selectedRide.customer_rating} / 5.0</p>
                                    </>
                                ) : (
                                    // Regular ride details
                                    <>
                                        <p><strong>Pickup:</strong> {selectedRide.pickup}</p>
                                        <p><strong>Destination:</strong> {selectedRide.destination}</p>
                                        <p><strong>Distance:</strong> {selectedRide.distance}</p>
                                        <p><strong>Fare:</strong> ₹{selectedRide.fare}</p>
                                        <p><strong>Customer:</strong> {selectedRide.customer_name}</p>
                                        <p><strong>Customer Rating:</strong> {selectedRide.customer_rating} / 5.0</p>
                                    </>
                                )}
                            </>
                        )}
                    </Modal.Body>
                    
                    <Modal.Footer>
                        <Button 
                            variant="secondary" 
                            onClick={() => setShowRideModal(false)}
                        >
                            Close
                        </Button>
                        <Button 
                            variant="danger" 
                            onClick={() => handleRideAction("decline")}
                            disabled={processingRideAction}
                        >
                            {processingRideAction ? "Processing..." : "Decline"}
                        </Button>
                        <Button 
                            variant="success" 
                            onClick={() => handleRideAction("accept")}
                            disabled={processingRideAction}
                        >
                            {processingRideAction ? "Processing..." : "Accept"}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </>
    );
};

export default DriverDashboard;
