import streamlit as st
import hashlib
import re
import os
import sys
from utils.db_utils import get_db_connection, create_session, get_session, delete_session

# Set page config
st.set_page_config(
    page_title="Namma Yatri",
    page_icon="🚕",
    layout="wide"
)

# Initialize session state
if "page" not in st.session_state:
    st.session_state.page = "login"
if "authenticated" not in st.session_state:
    st.session_state.authenticated = False
if "user_id" not in st.session_state:
    st.session_state.user_id = None
if "user_type" not in st.session_state:
    st.session_state.user_type = None
if "name" not in st.session_state:
    st.session_state.name = None

# Navigation functions
def navigate_to(page):
    st.session_state.page = page
    
def logout():
    st.session_state.authenticated = False
    st.session_state.user_id = None
    st.session_state.user_type = None
    st.session_state.name = None
    st.session_state.page = "login"

# Function to hash passwords
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# Email validation
def is_valid_email(email):
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return re.match(pattern, email) is not None

# Registration form
def show_registration_form():
    st.header("Register")
    
    name = st.text_input("Full Name")
    email = st.text_input("Email")
    password = st.text_input("Password", type="password")
    confirm_password = st.text_input("Confirm Password", type="password")
    user_type = st.selectbox("Register as", ["rider", "driver"])
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("Register"):
            if not name or not email or not password:
                st.error("Please fill all required fields")
            elif password != confirm_password:
                st.error("Passwords do not match")
            elif not is_valid_email(email):
                st.error("Please enter a valid email")
            else:
                # Register the user
                try:
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    
                    # Check if email already exists
                    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
                    if cursor.fetchone():
                        st.error("Email already registered")
                    else:
                        # Insert new user
                        cursor.execute(
                            "INSERT INTO users (name, email, password_hash, user_type) VALUES (%s, %s, %s, %s)",
                            (name, email, hash_password(password), user_type)
                        )
                        user_id = cursor.lastrowid
                        
                        # Add entry to rider or driver table
                        if user_type == "rider":
                            cursor.execute("INSERT INTO rider (rider_id) VALUES (%s)", (user_id,))
                        else:
                            cursor.execute("INSERT INTO driver (driver_id) VALUES (%s)", (user_id,))
                        
                        conn.commit()
                        st.success("Registration successful! Please log in.")
                        
                        # Auto-navigate to login page
                        navigate_to("login")
                    
                    cursor.close()
                    conn.close()
                except Exception as e:
                    st.error(f"An error occurred: {e}")
    
    with col2:
        if st.button("Back to Login"):
            navigate_to("login")

# Login form
def show_login_form():
    st.header("Login")
    
    email = st.text_input("Email", key="login_email")
    password = st.text_input("Password", type="password", key="login_password")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("Login"):
            if not email or not password:
                st.error("Please enter both email and password")
            else:
                try:
                    conn = get_db_connection()
                    cursor = conn.cursor(dictionary=True)
                    
                    # Check credentials
                    cursor.execute(
                        "SELECT user_id, name, user_type FROM users WHERE email = %s AND password_hash = %s", 
                        (email, hash_password(password))
                    )
                    user = cursor.fetchone()
                    
                    cursor.close()
                    conn.close()
                    
                    if user:
                        st.success(f"Welcome back, {user['name']}!")
                        
                        # Set session state
                        st.session_state.authenticated = True
                        st.session_state.user_id = user['user_id']
                        st.session_state.user_type = user['user_type']
                        st.session_state.name = user['name']
                        
                        # Navigate to dashboard
                        if user['user_type'] == 'rider':
                            navigate_to("rider_dashboard")
                        else:
                            navigate_to("driver_dashboard")
                        
                        st.rerun()
                    else:
                        st.error("Invalid email or password")
                except Exception as e:
                    st.error(f"An error occurred: {e}")
    
    with col2:
        if st.button("Register Instead"):
            navigate_to("register")

# Rider Dashboard
def show_rider_dashboard():
    st.title("Namma Yatri - Rider Dashboard")
    st.write(f"Welcome, {st.session_state.name}! Book your ride here.")
    
    # Add tabs for different rider functions
    tab1, tab2, tab3 = st.tabs(["Book a Ride", "Ride History", "Profile"])
    
    with tab1:
        st.subheader("Book a Ride")
        pickup = st.text_input("Pickup Location")
        dropoff = st.text_input("Destination")
        
        if st.button("Find Drivers"):
            if pickup and dropoff:
                st.success("Searching for drivers near your location...")
                # Placeholder for driver search functionality
                st.info("This is a demo - in a real app we would find nearby drivers")
            else:
                st.warning("Please enter both pickup and destination locations")
    
    with tab2:
        st.subheader("Your Ride History")
        st.info("Your past rides will appear here")
        # Placeholder for ride history table
    
    with tab3:
        st.subheader("Profile")
        st.text(f"Name: {st.session_state.name}")
        st.text(f"User Type: {st.session_state.user_type}")
        # Additional profile information would go here

# Driver Dashboard
def show_driver_dashboard():
    st.title("Namma Yatri - Driver Dashboard")
    st.write(f"Welcome, {st.session_state.name}! Accept rides and earn coins.")
    
    # Add tabs for different driver functions
    tab1, tab2, tab3 = st.tabs(["Available Rides", "Ride History", "Profile"])
    
    with tab1:
        st.subheader("Available Rides")
        st.info("Nearby ride requests will appear here")
        # Placeholder for available rides
        
        col1, col2 = st.columns(2)
        with col1:
            st.metric(label="Online Status", value="Available", delta=None)
        with col2:
            if st.button("Toggle Availability"):
                st.info("Status toggled (demo only)")
    
    with tab2:
        st.subheader("Your Ride History")
        st.info("Your past rides will appear here")
        # Placeholder for ride history table
    
    with tab3:
        st.subheader("Profile")
        st.text(f"Name: {st.session_state.name}")
        st.text(f"User Type: {st.session_state.user_type}")
        # Additional profile information would go here

# Sidebar navigation
def show_sidebar():
    with st.sidebar:
        st.title("Navigation")
        
        if st.session_state.authenticated:
            st.write(f"Logged in as: {st.session_state.name}")
            
            if st.session_state.user_type == "rider":
                if st.button("Rider Dashboard", key="nav_rider"):
                    navigate_to("rider_dashboard")
            else:
                if st.button("Driver Dashboard", key="nav_driver"):
                    navigate_to("driver_dashboard")
            
            if st.button("Logout", key="nav_logout"):
                logout()
                st.rerun()
        else:
            if st.button("Login", key="nav_login"):
                navigate_to("login")
            
            if st.button("Register", key="nav_register"):
                navigate_to("register")

# Main app
def main():
    show_sidebar()
    
    # Render the appropriate page based on navigation state
    if not st.session_state.authenticated:
        if st.session_state.page == "login":
            show_login_form()
        elif st.session_state.page == "register":
            show_registration_form()
    else:
        if st.session_state.user_type == "rider" and st.session_state.page == "rider_dashboard":
            show_rider_dashboard()
        elif st.session_state.user_type == "driver" and st.session_state.page == "driver_dashboard":
            show_driver_dashboard()
        else:
            # Fallback to correct dashboard if page doesn't match user type
            if st.session_state.user_type == "rider":
                navigate_to("rider_dashboard")
                show_rider_dashboard()
            else:
                navigate_to("driver_dashboard")
                show_driver_dashboard()

if __name__ == "__main__":
    main()
