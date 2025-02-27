from channels.generic.websocket import AsyncWebsocketConsumer
import json

class LivestreamConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print("Attempting to connect...")
        try:
            await self.accept()
            print("Connection accepted.")
        except Exception as e:
            print(f"Connection error: {e}")
    
    async def disconnect(self, close_code):
        print(f"Disconnected with code {close_code}")

    async def receive(self, text_data):
        print(f"Received data from frontend: {text_data}")
        
        # Send a sample message to the frontend
        sample_message = "Hello from the server!"
        await self.send(text_data=json.dumps({
            'message': sample_message
        }))