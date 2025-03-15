import streamlit as st
import sys
import os
import folium
from streamlit_folium import folium_static

# Add parent directory to path to import database utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from utils.db_utils import get_session, get_driver_location, update_driver_location, generate_random_bengaluru_location, get_db_connection

# Set page config
st.set_page_config(
    page_title="Namma Yatri - Driver Dashboard",
    page_icon="🚕",
    layout="wide"
)

# Check authentication
authenticated = False
params = st.query_params  # Changed from experimental_get_query_params

if "session_id" in params:
    session_data = get_session(params["session_id"][0])
    if session_data and session_data["user_type"] == "driver":
        authenticated = True
        user_data = session_data
        
        # Store in session state for convenience
        st.session_state.user_id = user_data["user_id"]
        st.session_state.name = user_data["name"]
        st.session_state.user_type = user_data["user_type"]
        st.session_state.session_id = user_data["session_id"]

# Main dashboard content
if authenticated:
    st.title("Namma Yatri - Driver Dashboard")
    st.write(f"Welcome, {user_data['name']}! Accept rides and earn coins.")
    
    # Get driver's location
    driver_location = get_driver_location(st.session_state.user_id)
    
    # Add a "Refresh Location" button that generates a new random location
    if st.button("Refresh Location"):
        new_location = generate_random_bengaluru_location()
        update_driver_location(
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
        st.write(f"**Area:** {driver_location.get('location', 'Unknown')}")
        st.write(f"**Latitude:** {driver_location.get('latitude', 'N/A')}")
        st.write(f"**Longitude:** {driver_location.get('longitude', 'N/A')}")
        
        # Add a toggle for driver availability
        is_available = st.checkbox("Available for rides", value=True)
        if st.button("Update Availability"):
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE driver SET is_available = %s WHERE driver_id = %s",
                    (is_available, st.session_state.user_id)
                )
                conn.commit()
                st.success(f"Status updated: {'Available' if is_available else 'Not available'} for rides")
            except Exception as e:
                st.error(f"Error updating availability: {e}")
            finally:
                if 'cursor' in locals() and cursor:
                    cursor.close()
                if 'conn' in locals() and conn:
                    conn.close()
    
    # Create a map centered on the driver's location
    with col2:
        if driver_location and driver_location.get('latitude') and driver_location.get('longitude'):
            driver_map = folium.Map(
                location=[driver_location['latitude'], driver_location['longitude']], 
                zoom_start=14
            )
            
            # Add a marker for the driver
            folium.Marker(
                [driver_location['latitude'], driver_location['longitude']],
                popup=f"You are here: {driver_location.get('location', 'Your location')}",
                tooltip="Your location",
                icon=folium.Icon(color="green", icon="car", prefix="fa"),
            ).add_to(driver_map)
            
            # Display the map
            folium_static(driver_map)
        else:
            st.warning("Location data not available")
    
    # Ride requests section
    st.subheader("Ride Requests")
    st.write("No new ride requests at the moment.")
    
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