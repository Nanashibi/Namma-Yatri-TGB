import streamlit as st
import mysql.connector
import hashlib
import re
import os
import sys

# Add parent directory to path to import database utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.db_utils import get_db_connection

# Set page config
st.set_page_config(
    page_title="Namma Yatri - Login/Register",
    page_icon="🚕",
    layout="centered"
)

# Initialize session state
if "authenticated" not in st.session_state:
    st.session_state.authenticated = False
if "user_id" not in st.session_state:
    st.session_state.user_id = None
if "user_type" not in st.session_state:
    st.session_state.user_type = None

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
                
                cursor.close()
                conn.close()
            except Exception as e:
                st.error(f"An error occurred: {e}")

# Login form
def show_login_form():
    st.header("Login")
    
    email = st.text_input("Email")
    password = st.text_input("Password", type="password")
    
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
                    
                    # Redirect to appropriate dashboard
                    st.experimental_rerun()
                else:
                    st.error("Invalid email or password")
            except Exception as e:
                st.error(f"An error occurred: {e}")

# Navigation after authentication
def show_dashboard_navigation():
    st.write(f"Logged in as: {st.session_state.name} ({st.session_state.user_type})")
    
    if st.button("Go to Dashboard"):
        if st.session_state.user_type == "rider":
            link = "../rider_dashboard/app.py"
        else:
            link = "../driver_dashboard/app.py"
        st.markdown(f'<meta http-equiv="refresh" content="0; url={link}">', unsafe_allow_html=True)
    
    if st.button("Logout"):
        st.session_state.authenticated = False
        st.session_state.user_id = None
        st.session_state.user_type = None
        st.experimental_rerun()

# Main app
def main():
    st.title("Namma Yatri")
    
    if st.session_state.authenticated:
        show_dashboard_navigation()
    else:
        tab1, tab2 = st.tabs(["Login", "Register"])
        
        with tab1:
            show_login_form()
        
        with tab2:
            show_registration_form()

if __name__ == "__main__":
    main()
