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

from .serializers import LiveStreamSerializer, StreamParticipantSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from django.http import JsonResponse
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from artists.models import Follow


# from rest_framework.decorators import api_view, permission_classes
# from rest_framework.permissions import IsAuthenticated
# from rest_framework.response import Response
# from agora_token_service.RtcTokenBuilder import RtcTokenBuilder
# from agora_token_service.RtmTokenBuilder import RtmTokenBuilder
# Role_Attendee = 0 # depreated, same as publisher
# Role_Publisher = 1 # for live broadcaster
# Role_Subscriber = 2 # default, for live audience
# Role_Admin = 101 # deprecated, same as publisher
# from django.conf import settings
# import time

# @api_view(['GET'])
# @permission_classes([IsAuthenticated])  # Requires Authentication
# def generate_agora_token(request, channel_name):
#     user_id = request.user.id  # Get the authenticated user's ID
#     app_id = settings.AGORA_APP_ID
#     app_certificate = settings.AGORA_APP_CERTIFICATE
#     expire_time = 3600  # 1 hour

#     rtc_token = RtcTokenBuilder.buildTokenWithUid(
#         app_id, app_certificate, channel_name, user_id, Role_Publisher, int(time.time()) + expire_time
#     )
#     rtm_token = RtmTokenBuilder.buildToken(
#         app_id, app_certificate, str(user_id), Role_Publisher, int(time.time()) + expire_time
#     )

#     return Response({
#         "rtc_token": rtc_token,
#         "rtm_token": rtm_token,
#         "channel_name": channel_name,
#         "user_id": user_id
#     })





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

                # Record the participant
                StreamParticipant.objects.get_or_create(stream=stream, user_id=request.user.id)
            # Add this before your problematic code

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
    
    
    



# Update in your views.py

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
    
    
    
    
    
    
    
    
    
    
    
        
# class LiveStreamInfoView(APIView):
#     permission_classes = [IsAuthenticated]
    
#     def get(self, request, channel_name):
#         try:
#             # Get the stream information
#             stream = LiveStream.objects.filter(
#                 channel_name=channel_name,
#                 status='active'
#             ).first()
            
#             if not stream:
#                 return Response(
#                     {'error': 'Stream not found or not active'}, 
#                     status=status.HTTP_404_NOT_FOUND
#                 )
            
#             # Get host information
#             host_data = {
#                 'id': stream.host.id,
#                 'username': stream.host.username,
#                 'first_name': stream.host.first_name,
#                 'last_name': stream.host.last_name,
#                 'profile_photo': stream.host.profile_photo.url if stream.host.profile_photo else None
#             }
            
#             # Get participant count
#             participant_count = StreamParticipant.objects.filter(
#                 stream=stream,
#                 left_at__isnull=True
#             ).count()
            
#             # Check if the user is already a participant
#             is_participant = StreamParticipant.objects.filter(
#                 stream=stream,
#                 user=request.user,
#                 left_at__isnull=True
#             ).exists()
            
#             # If not a participant, add them
#             if not is_participant:
#                 StreamParticipant.objects.create(
#                     stream=stream,
#                     user=request.user
#                 )
            
#             # Prepare the response
#             response_data = {
#                 'id': stream.id,
#                 'title': stream.title,
#                 'description': stream.description,
#                 'thumbnail': stream.thumbnail.url if stream.thumbnail else None,
#                 'channel_name': stream.channel_name,
#                 'created_at': stream.created_at,
#                 'host': host_data,
#                 'participant_count': participant_count + (0 if is_participant else 1)
#             }
            
#             return Response(response_data)
            
#         except Exception as e:
#             return Response(
#                 {'error': str(e)}, 
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )    
    
    
    
    # def get_queryset(self):
    #     """
    #     Filter streams based on query parameters:
    #     - following=true: Only streams from artists the user follows
    #     - popular=true: Order by participant count
    #     """
    #     queryset = super().get_queryset()
        
    #     # Annotate with participant count for filtering/ordering
    #     queryset = queryset.annotate(
    #         participant_count=Count('participants', filter=Q(participants__left_at__isnull=True))
    #     )
        
    #     # Filter for streams from artists the user follows
    #     following = self.request.query_params.get('following')
    #     if following and following.lower() == 'true':
    #         followed_artists = Follow.objects.filter(user=self.request.user).values_list('artist__user', flat=True)
    #         queryset = queryset.filter(host__in=followed_artists)
        
    #     # Order by popularity if requested
    #     popular = self.request.query_params.get('popular')
    #     if popular and popular.lower() == 'true':
    #         queryset = queryset.order_by('-participant_count')
            
    #     return queryset
    
    
    
    
    
        
    # @action(detail=True, methods=['post'])
    # def join(self, request, pk=None):
    #     """Join a stream as a participant"""
    #     stream = self.get_object()
    #     participant, created = StreamParticipant.objects.get_or_create(
    #         stream=stream,
    #         user=request.user,
    #         defaults={'joined_at': timezone.now()}
    #     )
        
    #     # If rejoining after leaving
    #     if not created and participant.left_at:
    #         participant.left_at = None
    #         participant.joined_at = timezone.now()
    #         participant.save()
            
    #     return Response({'status': 'joined stream'})
    
    # @action(detail=True, methods=['post'])
    # def leave(self, request, pk=None):
    #     """Leave a stream"""
    #     stream = self.get_object()
    #     try:
    #         participant = StreamParticipant.objects.get(
    #             stream=stream,
    #             user=request.user,
    #             left_at__isnull=True
    #         )
    #         participant.leave()
    #         return Response({'status': 'left stream'})
    #     except StreamParticipant.DoesNotExist:
    #         return Response(
    #             {'error': 'Not currently in this stream'},
    #             status=status.HTTP_400_BAD_REQUEST
    #         )
    
    # @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    # def end(self, request, pk=None):
    #     """End a stream (host only)"""
    #     stream = self.get_object()
        
    #     # Only the host can end the stream
    #     if request.user != stream.host:
    #         return Response(
    #             {'error': 'Only the host can end this stream'}, 
    #             status=status.HTTP_403_FORBIDDEN
    #         )
            
    #     stream.end_stream()
    #     return Response({'status': 'stream ended'})
    
    
    
    
    
    
# class JoinStreamView(APIView):
#     permission_classes = [IsAuthenticated]
    
#     def get(self, request):
#         try:
#             # Get the room name (channel_name) of the artist they want to join
#             room_name = request.GET.get('room', '')
#             if not room_name:
#                 return JsonResponse({'error': 'Room name is required.'}, status=400)
            
#             # Find the stream based on the channel name
#             stream = LiveStream.objects.filter(channel_name=room_name, status='active').first()
#             if not stream:
#                 raise PermissionDenied("Stream not found or not active.")
            
#             # Ensure the user is following the artist
#             if not Follow.objects.filter(user=request.user, artist=stream.host.artist_profile).exists():
#                 raise PermissionDenied("You must follow the artist to join the stream.")

#             # Record the participant if they aren't already added
#             StreamParticipant.objects.get_or_create(stream=stream, user=request.user)
            
#             # Generate Agora token for the user to join the stream
#             token = self.generate_token(room_name, request.user.id, 2)  # 2=audience

#             return JsonResponse({
#                 'token': token,
#                 'channel': room_name,
#                 'uid': request.user.id,
#                 'app_id': APP_ID,
#                 'role': 'audience'
#             })

#         except Exception as e:
#             print(f"Error occurred: {str(e)}")  # Debugging output
#             return JsonResponse({'error': str(e)}, status=400)

#     def generate_token(self, channel_name, uid, role):
#         try:
#             current_timestamp = int(time.time())
#             expiration_timestamp = current_timestamp + EXPIRATION_TIME_IN_SECONDS

#             return RtcTokenBuilder.buildTokenWithUid(
#                 APP_ID, APP_CERTIFICATE, channel_name, uid, role, expiration_timestamp
#             )
#         except Exception as e:
#             print(f"Error generating token: {str(e)}")  # Debugging output
#             raise e

# from rest_framework.decorators import api_view, permission_classes
# from rest_framework.permissions import IsAuthenticated
  
        
        
        
# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def current_user(request):
#     """
#     Return current user data
#     """
#     serializer = UserSerializer(request.user)
#     return Response(serializer.data)
        
# from rest_framework.response import Response
# from .serializers import UserSerializer
# from django.db.models import Count

# class LiveStreamListView(APIView):
#     permission_classes = [IsAuthenticated]
    
#     def get(self, request):
#         # Add current user data
#         user_serializer = UserSerializer(request.user)
        
#         # Get the list of artists the user is following
#         following_artists = Follow.objects.filter(user=request.user).values_list('artist_profile', flat=True)
        
#         if not following_artists:
#             return Response({
#                 "user": user_serializer.data,
#                 "message": "You are not following any artists."
#             }, status=200)  # Changed status for better UX

#         # Get all active streams of artists the user is following
#         streams = LiveStream.objects.filter(host__artist_profile__id__in=following_artists, status='active')
        
#         # Add annotation for participant count
#         streams = streams.annotate(participant_count=Count('participants'))
        
#         # Serialize the streams
#         stream_serializer = LiveStreamSerializer(streams, many=True)
        
#         # Return the response with both user and stream data
#         return Response({
#             "user": user_serializer.data,
#             "streams": stream_serializer.data
#         })
