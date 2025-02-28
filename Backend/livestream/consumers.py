from channels.generic.websocket import AsyncWebsocketConsumer
import json

class WebRTCSignalingConsumer(AsyncWebsocketConsumer):
    # Keep track of connected clients
    rooms = {}
    
    async def connect(self):
        print("WebRTC signaling connection attempting...")
        try:
            await self.accept()
            # Initialize instance variables
            self.room_id = None
            self.username = None
            print("WebRTC signaling connection accepted.")
        except Exception as e:
            print(f"Connection error: {e}")
    
    async def disconnect(self, close_code):
        # Remove user from any rooms they were in
        if hasattr(self, 'room_id') and self.room_id:
            room_id = self.room_id
            if room_id in self.rooms and self.channel_name in self.rooms[room_id]:
                self.rooms[room_id].remove(self.channel_name)
                # Notify others in the room that this user left
                await self.broadcast_user_left(room_id)
                
                # If room is empty, remove it
                if not self.rooms[room_id]:
                    del self.rooms[room_id]
        
        print(f"Client disconnected with code {close_code}.")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type', '')
            
            if message_type == 'join_room':
                # User wants to join a room
                room_id = data.get('roomId')
                username = data.get('username', 'Anonymous')
                
                # Create room if it doesn't exist
                if room_id not in self.rooms:
                    self.rooms[room_id] = []
                
                # Add user to the room
                if self.channel_name not in self.rooms[room_id]:
                    self.rooms[room_id].append(self.channel_name)
                
                # Store room_id and username for this connection
                self.room_id = room_id
                self.username = username
                
                # Notify user about existing participants
                existing_users = len(self.rooms[room_id]) - 1
                await self.send(text_data=json.dumps({
                    'type': 'room_joined',
                    'roomId': room_id,
                    'existingParticipants': existing_users
                }))
                
                # Notify other users in the room
                await self.broadcast_new_user(room_id)
            
            elif message_type == 'offer':
                # Forward SDP offer to the target peer
                target = data.get('target')
                sdp = data.get('sdp')
                
                if target:
                    await self.channel_layer.send(target, {
                        'type': 'webrtc.offer',
                        'sdp': sdp,
                        'sender': self.channel_name
                    })
            
            elif message_type == 'answer':
                # Forward SDP answer to the target peer
                target = data.get('target')
                sdp = data.get('sdp')
                
                if target:
                    await self.channel_layer.send(target, {
                        'type': 'webrtc.answer',
                        'sdp': sdp,
                        'sender': self.channel_name
                    })
            
            elif message_type == 'ice_candidate':
                # Forward ICE candidate to the target peer
                target = data.get('target')
                candidate = data.get('candidate')
                
                if target:
                    await self.channel_layer.send(target, {
                        'type': 'webrtc.ice_candidate',
                        'candidate': candidate,
                        'sender': self.channel_name
                    })
            
            elif message_type == 'chat':
                # Handle chat messages
                room_id = self.room_id
                message = data.get('message', '')
                
                # Broadcast chat message to all in the room
                if room_id in self.rooms:
                    for user_channel in self.rooms[room_id]:
                        await self.channel_layer.send(user_channel, {
                            'type': 'chat.message',
                            'username': self.username,
                            'message': message
                        })
        except Exception as e:
            print(f"Error processing message: {e}")
    
    async def broadcast_new_user(self, room_id):
        """Notify all users in a room about a new user"""
        if room_id in self.rooms:
            for user_channel in self.rooms[room_id]:
                if user_channel != self.channel_name:
                    await self.channel_layer.send(user_channel, {
                        'type': 'webrtc.new_peer',
                        'peer': self.channel_name
                    })
    
    async def broadcast_user_left(self, room_id):
        """Notify all users in a room that a user left"""
        if room_id in self.rooms:
            for user_channel in self.rooms[room_id]:
                if user_channel != self.channel_name:  # Only notify others
                    await self.channel_layer.send(user_channel, {
                        'type': 'webrtc.peer_left',
                        'peer': self.channel_name
                    })
    
    # Handler for different types of messages
    async def webrtc_new_peer(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_peer',
            'peer': event['peer']
        }))
    
    async def webrtc_peer_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'peer_left',
            'peer': event['peer']
        }))
    
    async def webrtc_offer(self, event):
        await self.send(text_data=json.dumps({
            'type': 'offer',
            'sdp': event['sdp'],
            'sender': event['sender']
        }))
    
    async def webrtc_answer(self, event):
        await self.send(text_data=json.dumps({
            'type': 'answer',
            'sdp': event['sdp'],
            'sender': event['sender']
        }))
    
    async def webrtc_ice_candidate(self, event):
        await self.send(text_data=json.dumps({
            'type': 'ice_candidate',
            'candidate': event['candidate'],
            'sender': event['sender']
        }))
    
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat',
            'username': event['username'],
            'message': event['message']
        }))