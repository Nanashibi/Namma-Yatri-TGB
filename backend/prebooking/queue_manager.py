import pika
import json
import time

RABBITMQ_HOST = "localhost"

class QueueManager:
    def __init__(self):
        self.connection = pika.BlockingConnection(pika.ConnectionParameters(RABBITMQ_HOST))
        self.channel = self.connection.channel()

    def create_queue(self, ward):
        """Declare a queue for the given ward"""
        self.channel.queue_declare(queue=f"prebook_{ward}", durable=True)

    def add_prebook_ride(self, ward, ride_details):
        """Publish a prebooked ride to the ward-specific queue"""
        self.create_queue(ward)  # Ensure the queue exists
        self.channel.basic_publish(
            exchange="",
            routing_key=f"prebook_{ward}",
            body=json.dumps(ride_details),
            properties=pika.BasicProperties(delivery_mode=2)  # Make message persistent
        )
        print(f"Ride added to queue: prebook_{ward}")

    def get_prebooked_rides(self, ward):
        """Retrieve all prebooked rides for a ward"""
        rides = []
        while True:
            method_frame, header_frame, body = self.channel.basic_get(queue=f"prebook_{ward}", auto_ack=False)
            if method_frame:
                rides.append(json.loads(body))
                self.channel.basic_nack(method_frame.delivery_tag, requeue=True)  # Requeue the message
            else:
                break
        return rides

    def close(self):
        self.connection.close()