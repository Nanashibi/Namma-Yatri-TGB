DROP DATABASE IF EXISTS namma_yatri_db;  -- Drop the existing database if it exists
CREATE DATABASE namma_yatri_db;  -- Create a new database
USE namma_yatri_db;  -- Select the newly created database

-- Create the 'users' table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type ENUM('customer', 'driver', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the 'rides' table
CREATE TABLE rides (
    ride_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    driver_id INT,
    pickup_location VARCHAR(255),
    dropoff_location VARCHAR(255),
    pickup_lat DECIMAL(10, 8),
    pickup_lon DECIMAL(11, 8),
    dropoff_lat DECIMAL(10, 8),
    dropoff_lon DECIMAL(11, 8),
    fare DECIMAL(10, 2) DEFAULT 150.00,
    status ENUM('pending', 'accepted', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(user_id),
    FOREIGN KEY (driver_id) REFERENCES users(user_id)
);

CREATE TABLE customer (
    customer_id INT PRIMARY KEY,
    location VARCHAR(255),
    latitude DECIMAL(10, 8) DEFAULT 12.9716,
    longitude DECIMAL(11, 8) DEFAULT 77.5946,
    FOREIGN KEY (customer_id) REFERENCES users(user_id)
);

-- Create the 'driver' table
CREATE TABLE driver (
    driver_id INT PRIMARY KEY,
    location VARCHAR(255),
    latitude DECIMAL(10, 8) DEFAULT 12.9716,
    longitude DECIMAL(11, 8) DEFAULT 77.5946,
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (driver_id) REFERENCES users(user_id)
);

-- Add an admin user for testing
INSERT INTO users (name, email, password_hash, user_type)
VALUES ('Admin User', 'admin@nammayatri.com', 'admin123', 'admin');

-- Add a test customer
INSERT INTO users (name, email, password_hash, user_type)
VALUES ('Test Customer', 'customer@example.com', 'password', 'customer');
INSERT INTO customer (customer_id) 
VALUES (LAST_INSERT_ID());

-- Add a test driver
INSERT INTO users (name, email, password_hash, user_type)
VALUES ('Test Driver', 'driver@example.com', 'password', 'driver');
INSERT INTO driver (driver_id, is_available) 
VALUES (LAST_INSERT_ID(), TRUE);

-- Add some more drivers for testing
INSERT INTO users (name, email, password_hash, user_type)
VALUES ('John Driver', 'john@driver.com', 'password', 'driver');
INSERT INTO driver (driver_id, is_available, latitude, longitude, location) 
VALUES (LAST_INSERT_ID(), TRUE, 12.9756, 77.6017, 'Richmond Road');

INSERT INTO users (name, email, password_hash, user_type)
VALUES ('Mary Driver', 'mary@driver.com', 'password', 'driver');
INSERT INTO driver (driver_id, is_available, latitude, longitude, location) 
VALUES (LAST_INSERT_ID(), TRUE, 12.9352, 77.6245, 'Koramangala');