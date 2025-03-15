import mysql.connector
import os
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
        print("Database setup successfully!")
        print("Test accounts created:")
        print("- Admin: admin@nammayatri.com / admin123")
        print("- customer: customer@example.com / password")
        print("- Driver: driver@example.com / password")
        
    except mysql.connector.Error as e:
        print(f"Error setting up database: {e}")
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    setup_database()
