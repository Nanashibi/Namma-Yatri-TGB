import streamlit as st
import sys
import os

# Add parent directory to path to import database utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from utils.db_utils import get_session

# Set page config
st.set_page_config(
    page_title="Namma Yatri - Driver Dashboard",
    page_icon="🚕",
    layout="wide"
)

# Check authentication
authenticated = False
params = st.experimental_get_query_params()

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
    
    # Add dashboard functionality here
    
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