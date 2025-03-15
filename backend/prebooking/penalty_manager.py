class PenaltyManager:
    def __init__(self):
        self.penalties = {}  # Stores driver penalties

    def add_penalty(self, driver_id):
        """Increase penalty count for a driver"""
        self.penalties[driver_id] = self.penalties.get(driver_id, 0) + 1
        print(f"Penalty added to driver {driver_id}. Total penalties: {self.penalties[driver_id]}")

    def get_penalty(self, driver_id):
        """Retrieve the penalty count for a driver"""
        return self.penalties.get(driver_id, 0)

    def reset_penalty(self, driver_id):
        """Reset a driver's penalties"""
        if driver_id in self.penalties:
            del self.penalties[driver_id]
            print(f"Penalties reset for driver {driver_id}")
