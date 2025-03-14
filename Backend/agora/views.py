from django.conf import settings
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
import time
import random
import string
from agora_token_builder import RtcTokenBuilder

from .models import LiveStream, StreamParticipant
from .serializers import LiveStreamSerializer, StreamParticipantSerializer

# Constants for Agora token generation
APP_ID = settings.AGORA_APP_ID
APP_CERTIFICATE = settings.AGORA_APP_CERTIFICATE
EXPIRATION_TIME_IN_SECONDS = 3600  # 1 hour


class AgoraTokenView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get channel name from request
        channel_name = request.GET.get('channel', '')
        
        # Generate a channel name if not provided
        if not channel_name:
            channel_name = f"stream-{request.user.id}-{int(time.time())}"
        
        # Determine if user is host or audience
        is_host = request.GET.get('role', 'audience').lower() == 'host'
        role = 1 if is_host else 2  # 1=host, 2=audience
        
        # Generate token
        token = self.generate_token(channel_name, request.user.id, role)
        
        # Record the stream in database
        if is_host:
            # Create or update stream record
            stream, created = LiveStream.objects.get_or_create(
                channel_name=channel_name,
                defaults={
                    'host': request.user,
                    'status': 'active',
                    'title': request.GET.get('title', f"{request.user.username}'s Stream")
                }
            )
            
            if not created:
                stream.status = 'active'
                stream.save()
        else:
            # Record participant
            stream = LiveStream.objects.filter(channel_name=channel_name, status='active').first()
            if stream:
                StreamParticipant.objects.get_or_create(
                    stream=stream,
                    user=request.user
                )
        
        return JsonResponse({
            'token': token,
            'channel': channel_name,
            'uid': request.user.id,
            'app_id': APP_ID,
            'role': 'host' if is_host else 'audience'
        })
    
    def generate_token(self, channel_name, uid, role):
        # Current timestamp
        current_timestamp = int(time.time())
        # Expiration timestamp
        expiration_timestamp = current_timestamp + EXPIRATION_TIME_IN_SECONDS
        
        # Build token with uid
        return RtcTokenBuilder.buildTokenWithUid(
            APP_ID, 
            APP_CERTIFICATE,
            channel_name,
            uid,
            role,
            expiration_timestamp
        )


class LiveStreamListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get all active streams
        streams = LiveStream.objects.filter(status='active')
        serializer = LiveStreamSerializer(streams, many=True)
        return JsonResponse(serializer.data, safe=False)


class EndStreamView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        channel_name = request.data.get('channel')
        
        # Find and end the stream
        stream = LiveStream.objects.filter(
            channel_name=channel_name,
            host=request.user
        ).first()
        
        if not stream:
            return JsonResponse(
                {'error': 'Stream not found or you are not the host'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update stream status
        stream.status = 'ended'
        stream.save()
        
        return JsonResponse({'status': 'success', 'message': 'Stream ended'})