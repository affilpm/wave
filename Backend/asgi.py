# # your_project_name/asgi.py
# import os
# from django.core.asgi import get_asgi_application
# from channels.routing import ProtocolTypeRouter, URLRouter
# from channels.auth import AuthMiddlewareStack
# from  import routing  # Import routing from your app

# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'your_project_name.settings')

# application = ProtocolTypeRouter({
#     "http": get_asgi_application(),
#     "websocket": AuthMiddlewareStack(
#         URLRouter(
#             routing.websocket_urlpatterns  # WebSocket URL routing
#         )
#     ),
# })