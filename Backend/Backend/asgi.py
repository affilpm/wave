import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import django

# Set up Django environment and initialize
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Backend.settings')
django.setup()

# Import the routing module after Django setup
from agora import routing

# Define the application with ProtocolTypeRouter for HTTP and WebSocket handling
application = ProtocolTypeRouter({
    "http": get_asgi_application(),  # Django's default ASGI application for handling HTTP
    "websocket": AuthMiddlewareStack(  # WebSocket configuration
        URLRouter(
            routing.websocket_urlpatterns
        )
    ),
})