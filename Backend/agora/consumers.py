# import json
# from channels.generic.websocket import AsyncWebsocketConsumer
# from channels.db import database_sync_to_async
# from django.utils import timezone
# from .models import LiveStream, StreamParticipant, ChatMessage

# class LiveStreamConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         self.channel_name = self.scope['url_route']['kwargs']['channel_name']
#         self.room_group_name = f'livestream_{self.channel_name}'
        
#         # Get user from scope
#         self.user = self.scope['user'].id
        
#         # Check if user is authenticated
#         if not self.user.is_authenticated:
#             await self.close()
#             return
        
#         # Join room group
#         await self.channel_layer.group_add(
#             self.room_group_name,
#             self.channel_name
#         )
        
#         await self.accept()
        
#         # Add user to participants and update count
#         await self.add_participant()
        
#         # Broadcast updated viewer count
#         await self.broadcast_viewer_count()
        
#         # Send welcome message
#         await self.send(text_data=json.dumps({
#             'type': 'system_message',
#             'message': f'Welcome to the stream, {self.user.username}!'
#         }))

#     async def disconnect(self, close_code):
#         # Remove participant and update count
#         await self.remove_participant()
        
#         # Leave room group
#         await self.channel_layer.group_discard(
#             self.room_group_name,
#             self.channel_name
#         )
        
#         # Broadcast updated viewer count
#         await self.broadcast_viewer_count()

#     async def receive(self, text_data):
#         data = json.dumps(text_data)
        
#         # Handle different message types
#         if data.get('type') == 'chat_message':
#             # Save chat message to database
#             await self.save_chat_message(data.get('message'))
            
#             # Send message to room group
#             await self.channel_layer.group_send(
#                 self.room_group_name,
#                 {
#                     'type': 'chat_message',
#                     'username': self.user.username,
#                     'message': data.get('message'),
#                     'profile_photo': self.user.profile_photo.url if self.user.profile_photo else None,
#                     'timestamp': timezone.now().isoformat()
#                 }
#             )
#         elif data.get('type') == 'heartbeat':
#             # Update participant's last activity timestamp
#             await self.update_participant_activity()

#     async def chat_message(self, event):
#         # Send message to WebSocket
#         await self.send(text_data=json.dumps({
#             'type': 'chat_message',
#             'username': event['username'],
#             'message': event['message'],
#             'profile_photo': event['profile_photo'],
#             'timestamp': event['timestamp']
#         }))

#     async def viewer_count(self, event):
#         # Send viewer count update to WebSocket
#         await self.send(text_data=json.dumps({
#             'type': 'viewer_count',
#             'count': event['count']
#         }))

#     @database_sync_to_async
#     def add_participant(self):
#         stream = LiveStream.objects.filter(
#             channel_name=self.channel_name,
#             status='active'
#         ).first()
        
#         if stream:
#             participant, created = StreamParticipant.objects.get_or_create(
#                 stream=stream,
#                 user=self.user,
#                 defaults={'last_active': timezone.now()}
#             )
            
#             if not created:
#                 participant.last_active = timezone.now()
#                 participant.is_active = True
#                 participant.save()
                
#             return True
#         return False

#     @database_sync_to_async
#     def remove_participant(self):
#         stream = LiveStream.objects.filter(
#             channel_name=self.channel_name
#         ).first()
        
#         if stream:
#             participant = StreamParticipant.objects.filter(
#                 stream=stream,
#                 user=self.user
#             ).first()
            
#             if participant:
#                 participant.is_active = False
#                 participant.last_active = timezone.now()
#                 participant.save()
                
#             return True
#         return False

#     @database_sync_to_async
#     def update_participant_activity(self):
#         stream = LiveStream.objects.filter(
#             channel_name=self.channel_name
#         ).first()
        
#         if stream:
#             participant = StreamParticipant.objects.filter(
#                 stream=stream,
#                 user=self.user
#             ).first()
            
#             if participant:
#                 participant.last_active = timezone.now()
#                 participant.is_active = True
#                 participant.save()
                
#             return True
#         return False

#     @database_sync_to_async
#     def save_chat_message(self, message):
#         stream = LiveStream.objects.filter(
#             channel_name=self.channel_name
#         ).first()
        
#         if stream:
#             ChatMessage.objects.create(
#                 stream=stream,
#                 user=self.user,
#                 message=message
#             )
            
#             return True
#         return False

#     @database_sync_to_async
#     def get_active_viewer_count(self):
#         stream = LiveStream.objects.filter(
#             channel_name=self.channel_name,
#             status='active'
#         ).first()
        
#         if stream:
#             # Count participants active in the last 30 seconds
#             active_time = timezone.now() - timezone.timedelta(seconds=30)
#             return StreamParticipant.objects.filter(
#                 stream=stream,
#                 is_active=True,
#                 last_active__gte=active_time
#             ).count()
            
#         return 0

#     async def broadcast_viewer_count(self):
#         count = await self.get_active_viewer_count()
        
#         await self.channel_layer.group_send(
#             self.room_group_name,
#             {
#                 'type': 'viewer_count',
#                 'count': count
#             }
#         )