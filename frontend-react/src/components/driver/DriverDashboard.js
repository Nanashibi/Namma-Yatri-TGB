import React, { useState, useEffect } from "react";

const DriverDashboard = () => {
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/driver")
      .then(response => response.json())
      .then(data => setDrivers(data.leaderboard))
      .catch(error => console.error("Error fetching data:", error));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Driver Leaderboard</h2>
      <table border="1" style={{ width: "100%", textAlign: "center" }}>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Driver ID</th>
            <th>Coins</th>
            <th>Tier</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver, index) => (
            <tr key={driver.driver_id}>
              <td>{index + 1}</td>
              <td>{driver.driver_id}</td>
              <td>{driver.coins}</td>
              <td>{driver.tier}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DriverDashboard;
