from django.urls import re_path
from .consumers import LiveStreamConsumer

websocket_urlpatterns = [
    re_path(r'ws/livestream/(?P<channel_name>\w+)/$', LiveStreamConsumer.as_asgi()),
]