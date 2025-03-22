from django.shortcuts import render
# Create your views here.
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


class AgoraTokenView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            channel_name = request.GET.get('channel', '')
            if not channel_name:
                channel_name = f"stream-{request.user.id}-{int(time.time())}"
            print(f"Type of request.user: {type(request.user)}")
            print(f"Type of request.user.id: {type(request.user.id)}")
            print(f"User ID value: {request.user.id}")
            is_host = request.GET.get('role', 'audience').lower() == 'host'
            role = 1 if is_host else 2  # 1=host, 2=audience

            if is_host:
                
                if request.user.is_superuser:
                    raise PermissionDenied("Superusers cannot host a stream.")
    
                # Check if user is an approved artist
                if not hasattr(request.user, 'artist_profile') or request.user.artist_profile.status != 'approved':
                    raise PermissionDenied("Only approved artists can start a stream.")
                
                # Check for an existing active stream and end it
                existing_stream = LiveStream.objects.filter(host_id=request.user.id, status='active').first()
                if existing_stream:
                    existing_stream.status = 'ended'
                    existing_stream.ended_at = timezone.now()
                    existing_stream.save()

                # Create a new stream
                stream = LiveStream.objects.create(
                    host_id=request.user.id,
                    channel_name=channel_name,
                    status='active',
                    title=request.GET.get('title', f"{request.user.username}'s Stream")
                )
            else:
                # Check if the stream exists and is active
                stream = LiveStream.objects.filter(channel_name=channel_name, status='active').first()
                if not stream:
                    raise PermissionDenied("Stream not found or not active.")

                # Prevent superusers from joining streams
                if request.user.is_superuser:
                    print("Superuser attempted to join a stream, blocking...")  # Debugging
                    return JsonResponse({'error': "Superusers cannot join streams."}, status=403)
                
                # Ensure the user is following the artist before joining
                if not Follow.objects.filter(user_id=request.user.id, artist=stream.host.artist_profile).exists():
                    raise PermissionDenied("You must follow the artist to join the stream.")

                # Important: First, clean up any possibly stale participant records for this user in this stream
                # This ensures if a user refreshes or reconnects, they don't get counted twice
                existing_participant = StreamParticipant.objects.filter(
                    stream=stream, 
                    user_id=request.user.id
                ).first()
                
                if existing_participant:
                    existing_participant.is_active = True
                    existing_participant.last_active = timezone.now()
                    existing_participant.save()
                else:
                    # Create new participant record
                    StreamParticipant.objects.create(
                        stream=stream,
                        user_id=request.user.id,
                        is_active=True,
                        last_active=timezone.now()
                    )
                
                # Clean up stale participants before returning active count
                # This ensures accurate counts on new joins
                stale_time = timezone.now() - timezone.timedelta(minutes=1)
                StreamParticipant.objects.filter(
                    stream=stream,
                    is_active=True,
                    last_active__lt=stale_time
                ).update(is_active=False)
                
                # Add to LiveStreamViewSet.list
                active_time = timezone.now() - timezone.timedelta(seconds=30)
                participants = StreamParticipant.objects.filter(
                    stream=stream,
                    is_active=True,
                    last_active__gte=active_time
                )
                print(f"Stream {stream.id}: Found {participants.count()} active participants")
                print(f"Active participants: {[p.user_id for p in participants]}")


            # Generate Agora token
            token = self.generate_token(channel_name, request.user.id, role)

            return JsonResponse({
                'token': token,
                'channel': channel_name,
                'uid': int(request.user.id),
                'app_id': APP_ID,
                'role': 'host' if is_host else 'audience'
            })

        except Exception as e:
            print(f"Error occurred: {str(e)}")  # Debugging output
            return JsonResponse({'error': str(e)}, status=400)
    

    
    def generate_token(self, channel_name, uid, role):
        try:
            current_timestamp = int(time.time())
            expiration_timestamp = current_timestamp + EXPIRATION_TIME_IN_SECONDS

            # Assign a unique UID if the provided one is 0 or None
            uid = int(uid) if uid else random.randint(1, 2**32 - 1)

            return RtcTokenBuilder.buildTokenWithUid(
                APP_ID, APP_CERTIFICATE, channel_name, uid, role, expiration_timestamp
            )
        except Exception as e:
            print(f"Error generating token: {str(e)}")
            raise e



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
                        'id': follow.id,
                        'user': {
                            'id': request.user.id,
                            'email': request.user.email,
                            'username': request.user.username,
                            'first_name': request.user.first_name,
                            'last_name': request.user.last_name,
                            'profile_photo': request.user.profile_photo.url if request.user.profile_photo else None,
                            'created_at': request.user.created_at,
                            'updated_at': request.user.updated_at
                        },
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