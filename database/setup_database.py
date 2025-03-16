import mysql.connector
import os
import pandas as pd
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_database():
    """Set up the database using mysql_setup.sql"""
    
    # Read SQL from mysql_setup.sql
    with open(os.path.join('database', 'mysql_setup.sql'), 'r') as f:
        sql_script = f.read()
    
    # Connect to MySQL without specifying a database (it might not exist yet)
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', '')
        )
        
        cursor = connection.cursor()
        
        # Execute the SQL script statement by statement
        for statement in sql_script.split(';'):
            if statement.strip():
                cursor.execute(statement + ';')
                
        connection.commit()
        
        # Load data from CSV files
        load_csv_data(connection)
        
        print("Database setup successfully!")
        print("Test accounts created:")
        print("- Admin: admin@nammayatri.com / admin123")
        print("- Customer: customer@example.com / password")
        print("- Driver: driver@example.com / password")
        
    except mysql.connector.Error as e:
        print(f"Error setting up database: {e}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

def load_csv_data(connection):
    """Load data from CSV files into the database line by line (first 100k rows)"""
    cursor = connection.cursor()

    # Base directory for CSV files
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    datasets_dir = os.path.join(base_dir, 'datasets')

    try:
        # Load driver data (first 100k rows)
        driver_data_path = os.path.join(datasets_dir, 'drivers_data.csv')
        driver_df = pd.read_csv(driver_data_path)  # Limit to 100k rows

        for _, row in driver_df.iterrows():
            cursor.execute("""
                INSERT INTO driver_data (driver_id, experience_months, primary_ward, base_acceptance_rate, peak_acceptance_rate, avg_daily_hours)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (row['driver_id'], row['experience_months'], row['primary_ward'], row['base_acceptance_rate'], row['peak_acceptance_rate'], row['avg_daily_hours']))

        # Load ride data (first 100k rows)
        ride_data_path = os.path.join(datasets_dir, 'rides_data.csv')
        ride_df = pd.read_csv(ride_data_path,nrows=500000)  # Limit to 100k rows

        for _, row in ride_df.iterrows():
            cursor.execute("""
                INSERT INTO ride_data (ride_id, timestamp, origin_ward, destination_ward, driver_id, distance_km, fare, surge_multiplier, duration_minutes, hour, day_of_week, is_weekend)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (row['ride_id'], row['timestamp'], row['origin_ward'], row['destination_ward'], row['driver_id'], row['distance_km'], row['fare'], row['surge_multiplier'], row['duration_minutes'], row['hour'], row['day_of_week'], row['is_weekend']))

        connection.commit()
        print("CSV data loaded successfully!")
    except mysql.connector.Error as e:
        print(f"Error loading CSV data: {e}")
    finally:
        if cursor:
            cursor.close()

if __name__ == "__main__":
    # Set up the database and load CSV data
    setup_database()