import os
import subprocess
import sys

def main():
    """Launch the Namma Yatri application"""
    print("Launching Namma Yatri app...")
    
    # Get the absolute path to main.py
    script_dir = os.path.dirname(os.path.abspath(__file__))
    main_script = os.path.join(script_dir, "main.py")
    
    # Launch streamlit with the main script
    cmd = [sys.executable, "-m", "streamlit", "run", main_script, "--server.port=8501"]
    subprocess.run(cmd)

if __name__ == "__main__":
    main()
