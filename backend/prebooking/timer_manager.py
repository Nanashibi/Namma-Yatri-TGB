import time
import threading
from queue_manager import QueueManager

class TimerManager:
    def __init__(self):
        self.queue_manager = QueueManager()

    def start_acceptance_timer(self, ward, ride_details, timeout=120):
        """Start a timer for driver acceptance"""
        print(f"Timer started for ride {ride_details['ride_id']} in {ward}. Timeout: {timeout}s")

        def timer_action():
            print(f"Time expired! Reassigning ride {ride_details['ride_id']} in {ward}")
            self.queue_manager.add_prebook_ride(ward, ride_details)  # Re-add to queue

        threading.Timer(timeout, timer_action).start()
