from channels.generic.websocket import AsyncWebsocketConsumer
import json
import jwt
from datetime import datetime
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed
from users.models import CustomUser
from urllib.parse import parse_qs
from asgiref.sync import sync_to_async

class WebRTCSignalingConsumer(AsyncWebsocketConsumer):
    rooms = {}
    available_rooms = {}  # Keep track of available rooms
    room_info = {}  # Store additional info about rooms (e.g., is it an artist room)

    async def connect(self):
        # Parse query string to get token
        query_string = self.scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        
        # Extract token (will be a list, so take first element if present)
        token = query_params.get('token', [None])[0]

        if not token:
            await self.close()
            return

        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            if 'exp' in payload and datetime.fromtimestamp(payload['exp']) < datetime.now():
                raise AuthenticationFailed('Token has expired.')

            # Get user from database using sync_to_async
            user = await self.get_user(payload['user_id'])
            self.user = user
            self.username = user.username
            
            # Check if user is an artist - also using sync_to_async
            self.is_artist, self.artist_id = await self.check_is_artist(user)

            await self.accept()

            self.room_id = None
            WebRTCSignalingConsumer.available_rooms[self.channel_name] = []  # Placeholder for user-specific rooms

            # Send available rooms list to the user
            await self.send(text_data=json.dumps({
                'type': 'available_rooms',
                'rooms': list(WebRTCSignalingConsumer.rooms.keys()),
                'room_info': WebRTCSignalingConsumer.room_info
            }))

            print(f"WebRTC signaling connection accepted for {self.username} (Artist: {self.is_artist}).")

            # Create a test room if none exist
            if not WebRTCSignalingConsumer.rooms:
                test_room_id = "test_room"
                WebRTCSignalingConsumer.rooms[test_room_id] = []
                WebRTCSignalingConsumer.room_info[test_room_id] = {
                    'test': True,
                    'created_at': datetime.now().isoformat()
                }
                print(f"Created test room: {test_room_id}")

            self.room_id = None
            WebRTCSignalingConsumer.available_rooms[self.channel_name] = []

        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            await self.close()
            print("Invalid or expired token.")
        except CustomUser.DoesNotExist:
            await self.close()
            print("User not found.")
        except Exception as e:
            await self.close()
            print(f"Connection error: {e}")

    # Helper methods that wrap database operations
    @sync_to_async
    def get_user(self, user_id):
        return CustomUser.objects.get(id=user_id)
    
    @sync_to_async
    def check_is_artist(self, user):
        try:
            is_artist = hasattr(user, 'artist_profile')
            artist_id = user.artist_profile.id if is_artist else None
            return is_artist, artist_id
        except Exception:
            return False, None

    # Rest of your methods remain the same
    async def disconnect(self, close_code):
        if hasattr(self, 'room_id') and self.room_id:
            room_id = self.room_id
            if room_id in self.rooms and self.channel_name in self.rooms[room_id]:
                self.rooms[room_id].remove(self.channel_name)
                await self.broadcast_user_left(room_id)
                if not self.rooms[room_id]:
                    del self.rooms[room_id]
                    # Remove room info if room is removed
                    if room_id in WebRTCSignalingConsumer.room_info:
                        del WebRTCSignalingConsumer.room_info[room_id]
                    
                    # Broadcast updated room list to all clients
                    for channel_name in WebRTCSignalingConsumer.available_rooms.keys():
                        await self.channel_layer.send(channel_name, {
                            'type': 'webrtc.room_update',
                            'rooms': list(WebRTCSignalingConsumer.rooms.keys())
                        })

        # Remove user from available rooms list
        if self.channel_name in WebRTCSignalingConsumer.available_rooms:
            del WebRTCSignalingConsumer.available_rooms[self.channel_name]

        print(f"Client disconnected with code {close_code}.")



    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type', '')

            if message_type == 'join_room':
                room_id = data.get('roomId')
                username = data.get('username', 'Anonymous')
                is_artist_room = data.get('is_artist_room', False)
                
                # If user is an artist and wants to create an artist room, format the room ID
                if self.is_artist and is_artist_room:
                    room_id = f"artist_{self.artist_id}"
                
                if room_id not in self.rooms:
                    self.rooms[room_id] = []
                    
                    # Record artist info if this is an artist room
                    if self.is_artist and is_artist_room:
                        WebRTCSignalingConsumer.room_info[room_id] = {
                            'artist_id': self.artist_id,
                            'username': self.username,
                            'is_artist_room': True
                        }
                    
                    # Broadcast to all connected clients that a new room is available
                    for channel_name in WebRTCSignalingConsumer.available_rooms.keys():
                        await self.channel_layer.send(channel_name, {
                            'type': 'webrtc.room_update',
                            'rooms': list(WebRTCSignalingConsumer.rooms.keys())
                        })

                if self.channel_name not in self.rooms[room_id]:
                    self.rooms[room_id].append(self.channel_name)

                self.room_id = room_id
                self.username = username

                # Notify about the room join
                existing_users = len(self.rooms[room_id]) - 1
                await self.send(text_data=json.dumps({
                    'type': 'room_joined',
                    'roomId': room_id,
                    'existingParticipants': existing_users,
                    'room_info': WebRTCSignalingConsumer.room_info.get(room_id, {})
                }))
                await self.broadcast_new_user(room_id)

            elif message_type == 'get_available_rooms':
                print(f"Received request for available rooms from {self.username}")
                print(f"Available rooms: {list(WebRTCSignalingConsumer.rooms.keys())}")
                print(f"Room info: {WebRTCSignalingConsumer.room_info}")
                
                await self.send(text_data=json.dumps({
                    'type': 'available_rooms',
                    'rooms': list(WebRTCSignalingConsumer.rooms.keys()),
                    'room_info': WebRTCSignalingConsumer.room_info
                }))

            
            # Handle other message types as before...
            elif message_type == 'offer':
                target = data.get('target')
                sdp = data.get('sdp')
                room_id = data.get('roomId')
                
                if target and sdp and room_id in self.rooms and target in self.rooms[room_id]:
                    await self.channel_layer.send(target, {
                        'type': 'webrtc.offer',
                        'sdp': sdp,
                        'sender': self.channel_name
                    })
            
            elif message_type == 'answer':
                target = data.get('target')
                sdp = data.get('sdp')
                
                if target and sdp and self.room_id and target in self.rooms[self.room_id]:
                    await self.channel_layer.send(target, {
                        'type': 'webrtc.answer',
                        'sdp': sdp,
                        'sender': self.channel_name
                    })
            
            elif message_type == 'ice_candidate':
                target = data.get('target')
                candidate = data.get('candidate')
                
                if target and candidate and self.room_id and target in self.rooms[self.room_id]:
                    await self.channel_layer.send(target, {
                        'type': 'webrtc.ice_candidate',
                        'candidate': candidate,
                        'sender': self.channel_name
                    })
            
            elif message_type == 'chat':
                message = data.get('message')
                room_id = data.get('roomId')
                
                if message and room_id in self.rooms:
                    for user_channel in self.rooms[room_id]:
                        await self.channel_layer.send(user_channel, {
                            'type': 'chat_message',
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
    
    async def webrtc_room_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'available_rooms',
            'rooms': event['rooms']
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