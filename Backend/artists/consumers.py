# # consumers.py
# import json
# from channels.generic.websocket import AsyncWebsocketConsumer

# class ArtistConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         # Accept the WebSocket connection
#         self.group_name = "artists"  # You can change this to a dynamic group if needed
#         await self.channel_layer.group_add(
#             self.group_name,
#             self.channel_name
#         )
#         await self.accept()

#     async def disconnect(self, close_code):
#         # Leave the group when the WebSocket is disconnected
#         await self.channel_layer.group_discard(
#             self.group_name,
#             self.channel_name
#         )

#     async def artist_update(self, event):
#         # Send message to WebSocket
#         await self.send(text_data=json.dumps({
#             'type': 'artist_update',
#             'data': event['data']
#         }))