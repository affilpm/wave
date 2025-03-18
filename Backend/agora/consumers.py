import json
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from asgiref.sync import sync_to_async
from .models import LiveStream, StreamParticipant 


class LiveStreamConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.channel_name = self.scope["url_route"]["kwrgs"]["channel_name"]
        self.room_group_name = f"stream_{self.channel_name}"
        
        user = self.scope["user"]
        if user and not isinstance(user, AnonymousUser):
            await self.add_participant(user)
            
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)    