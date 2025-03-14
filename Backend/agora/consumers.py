import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import LiveStream, StreamParticipant
from django.contrib.auth import get_user_model
from users.models import CustomUser

User = CustomUser

class LiveStreamConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.channel_name = self.scope['url_route']['kwargs']['channel_name']
        self.room_group_name = f'stream_{self.channel_name}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        user = self.scope['user']
        if user.is_authenticated:
            # Add user to participants if not already there
            await self.add_participant(user)
            
            # Notify everyone about new participant
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'participant_join',
                    'user_id': user.id,
                    'username': user.username,
                    'profile_photo': user.profile_photo.url if user.profile_photo else None
                }
            )
        
        await self.accept()
        
        # Send current stream info and participant count to the new connection
        stream_info = await self.get_stream_info()
        if stream_info:
            await self.send(text_data=json.dumps({
                'type': 'stream_info',
                'stream': stream_info
            }))
    
    async def disconnect(self, close_code):
        user = self.scope['user']
        if user.is_authenticated:
            # Notify everyone about participant leaving
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'participant_leave',
                    'user_id': user.id,
                    'username': user.username
                }
            )
            
            # Remove from participants
            await self.remove_participant(user)
        
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        user = self.scope['user']
        if not user.is_authenticated:
            return
            
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'chat_message':
            # Process chat message
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': data.get('message'),
                    'user_id': user.id,
                    'username': user.username,
                    'profile_photo': user.profile_photo.url if user.profile_photo else None,
                    'timestamp': data.get('timestamp')
                }
            )
        elif message_type == 'stream_end' and await self.is_host(user):
            # End the stream (only host can do this)
            await self.end_stream()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'stream_ended'
                }
            )
    
    # Event handlers
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
            'user_id': event['user_id'],
            'username': event['username'],
            'profile_photo': event['profile_photo'],
            'timestamp': event['timestamp']
        }))
    
    async def participant_join(self, event):
        await self.send(text_data=json.dumps({
            'type': 'participant_join',
            'user_id': event['user_id'],
            'username': event['username'],
            'profile_photo': event['profile_photo']
        }))
    
    async def participant_leave(self, event):
        await self.send(text_data=json.dumps({
            'type': 'participant_leave',
            'user_id': event['user_id'],
            'username': event['username']
        }))
    
    async def stream_ended(self, event):
        await self.send(text_data=json.dumps({
            'type': 'stream_ended'
        }))
    
    # Database helper methods
    @database_sync_to_async
    def add_participant(self, user):
        stream = LiveStream.objects.filter(channel_name=self.channel_name, status='active').first()
        if stream:
            StreamParticipant.objects.get_or_create(stream=stream, user=user)
    
    @database_sync_to_async
    def remove_participant(self, user):
        stream = LiveStream.objects.filter(channel_name=self.channel_name).first()
        if stream:
            StreamParticipant.objects.filter(stream=stream, user=user).delete()
    
    @database_sync_to_async
    def is_host(self, user):
        return LiveStream.objects.filter(channel_name=self.channel_name, host=user).exists()
    
    @database_sync_to_async
    def end_stream(self):
        stream = LiveStream.objects.filter(channel_name=self.channel_name, status='active').first()
        if stream:
            stream.status = 'ended'
            stream.save()
    
    @database_sync_to_async
    def get_stream_info(self):
        from .serializers import LiveStreamSerializer
        stream = LiveStream.objects.filter(channel_name=self.channel_name).first()
        if not stream:
            return None
        
        serializer = LiveStreamSerializer(stream)
        return serializer.data