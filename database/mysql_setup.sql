DROP DATABASE IF EXISTS namma_yatri_db;
CREATE DATABASE namma_yatri_db;
USE namma_yatri_db;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type ENUM('rider', 'driver') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rides (
    ride_id INT AUTO_INCREMENT PRIMARY KEY,
    rider_id INT NOT NULL,
    driver_id INT,
    pickup_location VARCHAR(255) NOT NULL,
    dropoff_location VARCHAR(255) NOT NULL,
    fare DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'accepted', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rider_id) REFERENCES users(user_id),
    FOREIGN KEY (driver_id) REFERENCES users(user_id)
);

CREATE TABLE rider (
    rider_id INT PRIMARY KEY,
    location VARCHAR(255),
    FOREIGN KEY (rider_id) REFERENCES users(user_id)
);

CREATE TABLE driver (
    driver_id INT PRIMARY KEY,
    location VARCHAR(255),
    FOREIGN KEY (driver_id) REFERENCES users(user_id)
);