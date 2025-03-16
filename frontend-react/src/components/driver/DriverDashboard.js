import React, { useState, useEffect, useContext } from "react";
import { Container, Row, Col, Card, Table, Badge } from "react-bootstrap";
import { AuthContext } from "../../contexts/AuthContext";
import Navbar from "../common/Navbar";

const DriverDashboard = () => {
    const { currentUser } = useContext(AuthContext);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [driverData, setDriverData] = useState(null);

    useEffect(() => {
        if (!currentUser) {
            setDriverData({ driver_id: "N/A", coins: 0, tier: "Bronze", rank: "N/A" });
            setLoading(false);
            return;
        }

        const fetchLeaderboard = async () => {
            try {
                setLoading(true);
                const response = await fetch("http://localhost:5000/api/gamification/driver");
                if (!response.ok) throw new Error(`API error: ${response.status}`);

                const data = await response.json();
                setLeaderboard(data.leaderboard.slice(0, 10)); // Limit to top 10

                const foundDriver = data.leaderboard.find((d) => d.driver_id === currentUser.driver_id);
                setDriverData(
                    foundDriver || { driver_id: currentUser.driver_id, coins: 0, tier: "Bronze", rank: "N/A" }
                );
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
                setDriverData({ driver_id: currentUser.driver_id, coins: 0, tier: "Bronze", rank: "N/A" });
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [currentUser]);

    return (
        <>
            <Navbar />
            <Container>
                <Row className="mt-4">
                    <Col md={4}>
                        <Card className="shadow">
                            <Card.Body>
                                <h4>Welcome, Driver {driverData?.driver_id}</h4>
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
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col md={8}>
                        <Card className="shadow">
                            <Card.Body>
                                <h4>🏆 Leaderboard</h4>
                                
                                {loading ? (
                                    <p>Loading leaderboard...</p>
                                ) : (
                                    <>
                                        {/* TOP 3 DISPLAY */}
                                        <Row className="mb-4 text-center">
                                            {leaderboard.slice(0, 3).map((driver, index) => (
                                                <Col key={index} md={4}>
                                                    <Card className="shadow" style={{
                                                        backgroundColor: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : "#cd7f32",
                                                        color: "#000"
                                                    }}>
                                                        <Card.Body>
                                                            <h5>#{driver.rank}</h5>
                                                            <h6>Driver {driver.driver_id}</h6>
                                                        </Card.Body>
                                                    </Card>
                                                </Col>
                                            ))}
                                        </Row>

                                        {/* RANK 4-10 TABLE */}
                                        <Table bordered hover responsive>
                                            <thead>
                                                <tr>
                                                    <th>Rank</th>
                                                    <th>Driver ID</th>
                                                    <th>Tier</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {leaderboard.slice(3).map((driver, index) => (
                                                    <tr key={index}>
                                                        <td>{driver.rank}</td>
                                                        <td>{driver.driver_id}</td>
                                                        <td>
                                                            <Badge bg={
                                                                driver.tier === "Platinum" ? "primary" :
                                                                driver.tier === "Gold" ? "warning" :
                                                                driver.tier === "Silver" ? "secondary" :
                                                                "" // No built-in bronze color, using inline style
                                                            } style={driver.tier === "Bronze" ? { backgroundColor: "#cd7f32" } : {}}>
                                                                {driver.tier}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default DriverDashboard;
