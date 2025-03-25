from django.shortcuts import render
# Create your views here.
import logging
from django.conf import settings
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import time
import random
import string
from agora_token_builder import RtcTokenBuilder
from .models import LiveStream, StreamParticipant
from .serializers import LiveStreamSerializer, StreamParticipantSerializer
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.http import JsonResponse
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from artists.models import Follow





# Constants for Agora token generation
APP_ID = settings.AGORA_APP_ID
APP_CERTIFICATE = settings.AGORA_APP_CERTIFICATE
EXPIRATION_TIME_IN_SECONDS = 3600  # 1 hour





logger = logging.getLogger(__name__)

class AgoraTokenView(APIView):
    """
    Handle token generation for Agora livestreaming with multiple access controls.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Generate Agora token with comprehensive access and stream management.
        """
        try:
            channel_name = self._get_channel_name(request)
            is_host = self._is_host_request(request)
            role = 1 if is_host else 2  # 1=host, 2=audience

            stream = self._manage_stream(request, channel_name, is_host)
            token = self._generate_token(channel_name, request.user.id, role)

            return self._prepare_token_response(token, channel_name, request.user.id, is_host)

        except Exception as e:
            logger.error(f"Token generation error: {str(e)}")
            return JsonResponse({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def _get_channel_name(self, request):
        """
        Generate or retrieve channel name.
        """
        channel_name = request.GET.get('channel', '')
        return channel_name or f"stream-{request.user.id}-{int(time.time())}"

    def _is_host_request(self, request):
        """
        Determine if the request is for a host or audience.
        """
        return request.GET.get('role', 'audience').lower() == 'host'

    def _validate_host_permissions(self, user):
        """
        Validate artist's permissions to start a stream.
        """
        if user.is_superuser:
            raise PermissionDenied("Superusers cannot host a stream.")

        if not hasattr(user, 'artist_profile') or user.artist_profile.status != 'approved':
            raise PermissionDenied("Only approved artists can start a stream.")

    def _manage_host_stream(self, user, channel_name):
        """
        Manage host's stream - end existing active streams and create new one.
        """
        # End any existing active stream
        LiveStream.objects.filter(
            host_id=user.id, 
            status='active'
        ).update(
            status='ended', 
            ended_at=timezone.now()
        )

        # Create new stream
        return LiveStream.objects.create(
            host_id=user.id,
            channel_name=channel_name,
            status='active',
            title=self.request.GET.get('title', f"{user.username}'s Stream")
        )

    def _validate_audience_permissions(self, user, stream):
        """
        Validate audience's permissions to join a stream.
        """
        if not stream:
            raise PermissionDenied("Stream not found or not active.")

        if user.is_superuser:
            logger.warning("Superuser attempted to join a stream")
            raise PermissionDenied("Superusers cannot join streams.")

        # Check if audience follows the artist
        if not Follow.objects.filter(user_id=user.id, artist=stream.host.artist_profile).exists():
            raise PermissionDenied("You must follow the artist to join the stream.")

    def _manage_stream_participant(self, stream, user):
        """
        Manage stream participant tracking and cleanup.
        """
        # Update or create participant record
        participant, created = StreamParticipant.objects.get_or_create(
            stream=stream,
            user_id=user.id,
            defaults={
                'is_active': True,
                'last_active': timezone.now()
            }
        )

        if not created:
            participant.is_active = True
            participant.last_active = timezone.now()
            participant.save()

        # Clean up stale participants
        stale_time = timezone.now() - timezone.timedelta(minutes=1)
        StreamParticipant.objects.filter(
            stream=stream,
            is_active=True,
            last_active__lt=stale_time
        ).update(is_active=False)

    def _manage_stream(self, request, channel_name, is_host):
        """
        Centralized stream management logic.
        """
        if is_host:
            self._validate_host_permissions(request.user)
            return self._manage_host_stream(request.user, channel_name)
        else:
            stream = LiveStream.objects.filter(channel_name=channel_name, status='active').first()
            self._validate_audience_permissions(request.user, stream)
            self._manage_stream_participant(stream, request.user)
            return stream

    def _generate_token(self, channel_name, uid, role):
        """
        Generate Agora RTC token with error handling.
        """
        try:
            current_timestamp = int(time.time())
            expiration_timestamp = current_timestamp + EXPIRATION_TIME_IN_SECONDS

            uid = int(uid) if uid else random.randint(1, 2**32 - 1)

            return RtcTokenBuilder.buildTokenWithUid(
                APP_ID, APP_CERTIFICATE, channel_name, uid, role, expiration_timestamp
            )
        except Exception as e:
            logger.error(f"Token generation error: {str(e)}")
            raise

    def _prepare_token_response(self, token, channel_name, user_id, is_host):
        """
        Prepare standardized token response.
        """
        return JsonResponse({
            'token': token,
            'channel': channel_name,
            'uid': int(user_id),
            'app_id': APP_ID,
            'role': 'host' if is_host else 'audience'
        })

    




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
    
    
    






class LiveStreamViewSet(viewsets.ModelViewSet):
    queryset = LiveStream.objects.filter(status='active')
    serializer_class = None  # Will be defined in your project
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'host__username']
    ordering_fields = ['created_at', 'participant_count']
    ordering = ['-created_at']

    def list(self, request, *args, **kwargs):
        """
        Custom list method to include followed artists with their streams
        """
        queryset = self.get_queryset()
        
        # Get all artists that the user follows
        followed_artists = []
        if request.user.is_authenticated:
            followed = Follow.objects.filter(user=request.user).select_related('artist', 'artist__user')
            
            for follow in followed:
                artist_data = {
                    'id': follow.artist.user.id,
                    'email': follow.artist.user.email,
                    'username': follow.artist.user.username,
                    'first_name': follow.artist.user.first_name,
                    'last_name': follow.artist.user.last_name,
                    'bio': follow.artist.bio,
                    'status': follow.artist.status,
                    'profile_photo': follow.artist.user.profile_photo.url if follow.artist.user.profile_photo else None,
                    'submitted_at': follow.artist.submitted_at,
                    'updated_at': follow.artist.updated_at
                }
                
                # Check if this artist has an active stream
                stream = LiveStream.objects.filter(
                    host=follow.artist.user,
                    status='active'
                ).first()
                
                if stream:
                    # Get accurate active viewer count (active in last 30 seconds)
                    active_time = timezone.now() - timezone.timedelta(seconds=30)
                    participant_count = StreamParticipant.objects.filter(
                        stream=stream,
                        is_active=True,
                        last_active__gte=active_time
                    ).count()
                    
                    followed_artists.append({

                        'artist': artist_data,
                        'channel_name': stream.channel_name,
                        'participant_count': participant_count
                    })
        
        return Response(followed_artists)
    
    
    
    
    
    
    
    
    
    
    

class ParticipantHeartbeatView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        channel_name = request.data.get('channel_name')
        
        # Get the stream
        stream = LiveStream.objects.filter(
            channel_name=channel_name,
            status='active'
        ).first()
        
        if not stream:
            return JsonResponse({'error': 'Stream not found or inactive'}, status=404)
        
        # Update the last_active timestamp for this participant
        participant = StreamParticipant.objects.filter(
            stream=stream,
            user=request.user
        ).first()
        
        # Mark stale participants as inactive - reduced from 5 minutes to 1 minute
        # This ensures we clean up inactive participants more aggressively
        stale_time = timezone.now() - timezone.timedelta(minutes=1)
        stale_participants_count = StreamParticipant.objects.filter(
            stream=stream,
            is_active=True, 
            last_active__lt=stale_time
        ).count()
        
        if stale_participants_count > 0:
            print(f"Stream {stream.id}: Marking {stale_participants_count} stale participants as inactive")
            StreamParticipant.objects.filter(
                stream=stream,
                is_active=True, 
                last_active__lt=stale_time
            ).update(is_active=False)
        
        if participant:
            participant.last_active = timezone.now()
            participant.is_active = True
            participant.save()
            
            # Return current active count for the stream
            active_time = timezone.now() - timezone.timedelta(seconds=30)
            active_count = StreamParticipant.objects.filter(
                stream=stream,
                is_active=True,
                last_active__gte=active_time
            ).count()
            
            return JsonResponse({
                'status': 'success',
                'active_participants': active_count
            })
        
        return JsonResponse({'error': 'Participant not found'}, status=404)



class ParticipantLeaveView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        channel_name = request.data.get('channel_name')
        # Mark the participant as inactive
        participant = StreamParticipant.objects.filter(
            stream__channel_name=channel_name,
            user=request.user
        ).first()
        
        if participant:
            participant.is_active = False
            participant.save()
            
            # Return updated active count for the stream
            active_time = timezone.now() - timezone.timedelta(seconds=30)
            active_count = StreamParticipant.objects.filter(
                stream__channel_name=channel_name,
                is_active=True,
                last_active__gte=active_time
            ).count()
            
            return JsonResponse({
                'status': 'success', 
                'active_participants': active_count
            })
        return JsonResponse({'error': 'Participant not found'}, status=404)
    


class ViewerCountView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        channel_name = request.GET.get('channel_name')
        
        # Get the stream
        stream = LiveStream.objects.filter(
            channel_name=channel_name,
            status='active'
        ).first()
        
        if not stream:
            return JsonResponse({'error': 'Stream not found or inactive'}, status=404)
        
        # Ensure the requester is the host
        if stream.host_id != request.user.id:
            return JsonResponse({'error': 'Only the host can view participant count'}, status=403)
        
        # Get active participants count (excluding the host)
        active_time = timezone.now() - timezone.timedelta(seconds=30)
        active_count = StreamParticipant.objects.filter(
            stream=stream,
            is_active=True,
            last_active__gte=active_time
        ).exclude(user_id=request.user.id).count()
        
        return JsonResponse({
            'status': 'success',
            'active_participants': active_count
        })    