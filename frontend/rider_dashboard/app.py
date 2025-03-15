import streamlit as st
import sys
import os
import folium
from streamlit_folium import folium_static

# Add parent directory to path to import database utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from utils.db_utils import get_session, get_rider_location, update_rider_location, generate_random_bengaluru_location

# Set page config
st.set_page_config(
    page_title="Namma Yatri - Rider Dashboard",
    page_icon="🚕",
    layout="wide"
)

# Check authentication
authenticated = False
params = st.query_params  # Changed from experimental_get_query_params

if "session_id" in params:
    session_data = get_session(params["session_id"][0])
    if session_data and session_data["user_type"] == "rider":
        authenticated = True
        user_data = session_data
        
        # Store in session state for convenience
        st.session_state.user_id = user_data["user_id"]
        st.session_state.name = user_data["name"]
        st.session_state.user_type = user_data["user_type"]
        st.session_state.session_id = user_data["session_id"]

# Main dashboard content
if authenticated:
    st.title("Namma Yatri - Rider Dashboard")
    st.write(f"Welcome, {user_data['name']}! Book your ride here.")
    
    # Get rider's location
    rider_location = get_rider_location(st.session_state.user_id)
    
    # Add a "Refresh Location" button that generates a new random location
    if st.button("Refresh Location"):
        new_location = generate_random_bengaluru_location()
        update_rider_location(
            st.session_state.user_id, 
            new_location["location_name"], 
            new_location["latitude"], 
            new_location["longitude"]
        )
        st.experimental_rerun()
    
    # Display current location information
    st.subheader("Your Current Location")
    col1, col2 = st.columns(2)
    with col1:
        st.write(f"**Area:** {rider_location.get('location', 'Unknown')}")
        st.write(f"**Latitude:** {rider_location.get('latitude', 'N/A')}")
        st.write(f"**Longitude:** {rider_location.get('longitude', 'N/A')}")
    
    # Create a map centered on the rider's location
    with col2:
        if rider_location and rider_location.get('latitude') and rider_location.get('longitude'):
            rider_map = folium.Map(
                location=[rider_location['latitude'], rider_location['longitude']], 
                zoom_start=14
            )
            
            # Add a marker for the rider
            folium.Marker(
                [rider_location['latitude'], rider_location['longitude']],
                popup=f"You are here: {rider_location.get('location', 'Your location')}",
                tooltip="Your location",
                icon=folium.Icon(color="blue", icon="user", prefix="fa"),
            ).add_to(rider_map)
            
            # Display the map
            folium_static(rider_map)
        else:
            st.warning("Location data not available")
    
    # Book a ride section
    st.subheader("Book a Ride")
    with st.form("book_ride_form"):
        destination = st.text_input("Enter your destination")
        submit_button = st.form_submit_button("Find Drivers")
        
        if submit_button and destination:
            st.success(f"Searching for drivers near you for a ride to {destination}...")
            # This would connect to the backend to find drivers
    
    # Logout button
    if st.sidebar.button("Logout"):
        logout_url = f"../auth/app.py"
        js_redirect = f"""
        <script>
            window.location.href = "{logout_url}";
        </script>
        """
        st.markdown(js_redirect, unsafe_allow_html=True)
else:
    st.error("You need to be logged in to access this page")
    
    if st.button("Go to Login"):
        login_url = "../auth/app.py"
        js_redirect = f"""
        <script>
            window.location.href = "{login_url}";
        </script>
        """
        st.markdown(js_redirect, unsafe_allow_html=True)