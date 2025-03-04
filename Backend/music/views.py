from django.shortcuts import render, get_object_or_404
from .models import Genre, Music
from .serializers import GenreSerializer, MusicSerializer, MusicDataSerializer, EqualizerPresetSerializer
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.permissions import IsAdminUser
from .models import Music, MusicApprovalStatus
from .serializers import MusicVerificationSerializer
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db import transaction
from .models import Album
# from .serializers import AlbumSerializer
from mutagen.mp3 import MP3
from mutagen.wavpack import WavPack
from mutagen import File
from .models import AlbumTrack
# from .serializers import AlbumTrackSerializer
from django.core.exceptions import ValidationError
from django.db import IntegrityError
import json
from django.http import HttpResponse, FileResponse
from django.utils import timezone
import os
import time
import hmac
import hashlib
from datetime import datetime, timedelta
from django.conf import settings
from django.core.cache import cache
from django.http import StreamingHttpResponse
from rest_framework.permissions import AllowAny  
from listening_history.models import PlayCount, PlayHistory, PlaySession
from .models import EqualizerPreset
from rest_framework import generics
from django.db.models import F
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from users.models import CustomUser
from django.db import models, transaction
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status


class GenreViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    permission_classes = [IsAuthenticated]
    
    
class PublicGenresViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Genre.objects.filter(musical_works__is_public=True).distinct()
    serializer_class = GenreSerializer


##
class PublicSongsView(generics.ListAPIView):
    serializer_class = MusicDataSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Music.objects.filter(
            artist__user=self.request.user,
            is_public=True,
            approval_status='approved'
        ).order_by('-release_date')
        

class SongsByArtistView(generics.ListAPIView):
    serializer_class = MusicDataSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        artist_id = self.kwargs.get('artist_id')
        return Music.objects.filter(
            artist__id=artist_id,
            is_public=True,
            approval_status='approved'
        ).order_by('-release_date')        
        



class MusicPagination(PageNumberPagination):
    page_size = 8
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    
class MusicViewSet(ModelViewSet):
    queryset = Music.objects.all()
    serializer_class = MusicSerializer
    parser_classes = (MultiPartParser, FormParser)
    pagination_class = MusicPagination  


    @transaction.atomic
    def create(self, request, *args, **kwargs):
        try:
            artist = request.user.artist_profile
            duration_str = request.data.get('duration')
            duration = None
            if duration_str:
                try:
                    # Using isodate to parse the ISO 8601 duration format
                    import isodate
                    duration = isodate.parse_duration(duration_str)
                except (ValueError, TypeError) as e:
                    return Response(
                        {'error': f'Invalid duration format: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            print(duration)        
            # Prepare music data
            music_data = {
                'name': request.data.get('name'),
                'release_date': request.data.get('release_date'),
                'artist': artist.id,
                'genres': request.data.getlist('genres[]'),
                'duration': duration,
                **{field: request.FILES[field] 
                for field in ['audio_file', 'cover_photo', 'video_file'] 
                if field in request.FILES}
            }

            serializer = self.get_serializer(data=music_data)
            if not serializer.is_valid():
                return Response(
                    {'error': 'Validation failed', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            music_track = serializer.save()

            # Handle album assignment
            album_id = request.data.get('album')
            track_number = request.data.get('track_number')
            
            if album_id and track_number:
                try:
                    album = Album.objects.select_for_update().get(
                        id=album_id, 
                        artist=artist
                    )
                    
                    # Check for duplicate track numbers
                    if AlbumTrack.objects.filter(
                        album=album, 
                        track_number=track_number
                    ).exists():
                        raise ValidationError('Track number already exists in this album')
                    
                    AlbumTrack.objects.create(
                        album=album,
                        track=music_track,
                        track_number=int(track_number)
                    )
                    
                except Album.DoesNotExist:
                    return Response(
                        {'error': 'Album not found or does not belong to artist'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                except ValidationError as e:
                    return Response(
                        {'error': str(e)},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    # @action(detail=True)
    # def streaming_stats(self, request, pk=None):
    #         music = self.get_object()
    #         stats = StreamingSession.objects.filter(music=music).aggregate(
    #             total_plays=Count('id'),
    #             completed_plays=Count('id', filter=Q(completed=True)),
    #             average_duration=Avg('last_position')
    #         )
            
    #         serializer = StreamingStatsSerializer({
    #             'id': music.id,
    #             'name': music.name,
    #             **stats
    #         })
    #         return Response(serializer.data)    
        
        
        
    @action(detail=False, methods=['get'])
    def check_name(self, request):
        name = request.query_params.get('name', '').strip()
        artist = request.user.artist_profile
        exists = Music.objects.filter(
            name__iexact=name, 
            artist=artist
        ).exists()
        return Response({
            'exists': exists
        })
        
    def get_queryset(self):
        search_term = self.request.query_params.get('search', '')
        queryset = Music.objects.filter(artist__user=self.request.user).order_by('-created_at')
        
        if search_term:
            queryset = queryset.filter(
                Q(name__icontains=search_term)  # Search by track name
            ).distinct()

        return queryset
        
        
        
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Completely delete the music file and cover photo
        if instance.audio_file:
            instance.audio_file.delete(save=False)
        if instance.video_file:
            instance.video_file.delete(save=False)
        if instance.cover_photo:
            instance.cover_photo.delete(save=False)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['POST'])
    def toggle_visibility(self, request, pk=None):
        music = self.get_object()
        music.is_public = not music.is_public
        music.save()
        return Response({'is_public': music.is_public})
    
      

###
         

    
    
    










####################streaming$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
from rest_framework.decorators import api_view, permission_classes

# 4. Rather than modifying the token, let's create a play_session table without changing the token format

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_signed_token(request, music_id):
    from django.conf import settings
    
    # Create a play session with a unique ID
    play_id = f"{request.user.id}-{music_id}-{int(time.time())}"
    
    # Create a token (standard format)
    signed_token = generate_signed_token(request.user.id, music_id, settings.SECRET_KEY, expiry_seconds=3600)
    
    # Store the relationship between token and play_id
    cache.set(f"play_session:{signed_token}", play_id, timeout=3600)
    
    # Create a play session entry to track this attempt
    PlaySession.objects.create(
        user=request.user,
        music_id=music_id,
        play_id=play_id,
        status='initiated'
    )
    
    return Response({'token': signed_token, 'play_id': play_id})

# 3. Update the token generation to include the play_id

# 1. First, revert the token generation to its original format
def generate_signed_token(user_id, music_id, secret_key, expiry_seconds=3600):
    expiry = int(time.time()) + expiry_seconds
    message = f"{user_id}:{music_id}:{expiry}"
    signature = hmac.new(secret_key.encode(), message.encode(), hashlib.sha256).hexdigest()
    # Format: user_id:music_id:expiry:signature
    return f"{user_id}:{music_id}:{expiry}:{signature}"

# 2. Keep the original verify_signed_token function
def verify_signed_token(signed_token, music_id, secret_key):
    """
    Verifies the token and, if valid, returns the user_id as an integer.
    Otherwise, returns False.
    """
    try:
        parts = signed_token.split(':')
        if len(parts) != 4:
            print("Token format error:", signed_token)
            return False
        token_user_id, token_music_id, expiry, token_signature = parts
        if int(token_music_id) != music_id:
            print("Music ID mismatch:", token_music_id, "expected:", music_id)
            return False
        if int(expiry) < time.time():
            print("Token expired. Expiry:", expiry, "Now:", int(time.time()))
            return False
        message = f"{token_user_id}:{token_music_id}:{expiry}"
        expected_signature = hmac.new(secret_key.encode(), message.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_signature, token_signature):
            print("Signature mismatch. Expected:", expected_signature, "Got:", token_signature)
            return False
        return int(token_user_id)
    except Exception as e:
        print("Exception during token verification:", str(e))
        return False






@api_view(['POST'])
@permission_classes([IsAuthenticated])
def Record_play_completion(request):
    """
    API endpoint for the frontend to report play completion status.
    Uses play_id to prevent duplicate counting and accumulates play time
    across multiple play/pause cycles.
    """
    music_id = request.data.get('music_id')
    played_duration = request.data.get('played_duration')
    play_percentage = request.data.get('play_percentage')
    play_id = request.data.get('play_id')
    
    if not music_id or (played_duration is None and play_percentage is None):
        return Response({'error': 'Missing required data'}, status=400)
    
    try:
        music = get_object_or_404(Music, pk=music_id)
        
        # Calculate played duration if only percentage was provided
        if played_duration is None and play_percentage is not None:
            if music.duration:
                played_duration = music.duration * float(play_percentage)
            else:
                # Can't calculate duration without track length
                return Response({'error': 'Track duration unknown'}, status=400)
        
        # Convert played_duration explicitly
        played_duration = float(played_duration)

        # Ensure min_duration uses proper data types
        min_duration = min(
            float(MusicStreamView.MIN_PLAY_DURATION_SECONDS),
            float(music.duration.total_seconds()) * float(MusicStreamView.MIN_PLAY_PERCENTAGE) 
            if isinstance(music.duration, timedelta) else 
            float(music.duration) * float(MusicStreamView.MIN_PLAY_PERCENTAGE) 
            if music.duration else float('inf')
        )

        # If play_id is provided, use PlaySession approach
        if play_id:
            try:
                play_session = PlaySession.objects.get(
                    play_id=play_id,
                    user=request.user,
                    music_id=music_id
                )
                
                # Accumulate duration from previous plays in this session
                accumulated_duration = play_session.duration or 0
                new_total_duration = accumulated_duration + played_duration
                
                # Determine if this should count as a legitimate play based on accumulated time
                should_count = new_total_duration >= min_duration
                
                # If already completed and counted, don't count again
                if play_session.status == 'completed' and play_session.counted_as_play:
                    return Response({
                        'success': True,
                        'counted_as_play': True,
                        'message': 'Play already counted',
                        'accumulated_duration': new_total_duration
                    })
                
                # Update the play session
                play_session.duration = new_total_duration
                
                # Only mark as completed if it meets the threshold
                if should_count:
                    play_session.status = 'completed'
                    play_session.completed_at = timezone.now()
                    play_session.counted_as_play = True
                else:
                    play_session.status = 'in_progress'
                
                play_session.save()
                
                # Log for debugging
                print(f"Play session update: user={request.user.id}, music={music_id}, new_duration={new_total_duration}, should_count={should_count}")
                
                # Only increment play counts for legitimate plays that haven't been counted yet
                if should_count and not play_session.counted_as_play:
                    # Use transaction.atomic to ensure consistency
                    with transaction.atomic():
                        # Explicitly get or create the PlayCount with select_for_update
                        try:
                            play_count = PlayCount.objects.select_for_update().get(
                                user=request.user,
                                music=music
                            )
                            # Update using direct assignment rather than F expression for debugging
                            play_count.count += 1
                            play_count.last_played = timezone.now()
                            play_count.save()
                            print(f"Updated play count: {play_count.count}")
                        except PlayCount.DoesNotExist:
                            play_count = PlayCount.objects.create(
                                user=request.user,
                                music=music,
                                count=1,
                                last_played=timezone.now()
                            )
                            print(f"Created new play count: {play_count.count}")
                        
                        # Update global music play count directly
                        music.play_count = F('play_count') + 1
                        music.last_played = timezone.now()
                        music.save()
                        print(f"Updated music play count")
                
                return Response({
                    'success': True,
                    'counted_as_play': should_count,
                    'accumulated_duration': new_total_duration
                })
                
            except PlaySession.DoesNotExist:
                # No session found, create a new play history entry
                print(f"Creating new play session for play_id={play_id}")
                play_session = PlaySession.objects.create(
                    play_id=play_id,
                    user=request.user,
                    music=music,
                    status='in_progress',
                    duration=played_duration,
                    counted_as_play=False
                )
                
                should_count = played_duration >= min_duration
                if should_count:
                    play_session.status = 'completed'
                    play_session.completed_at = timezone.now()
                    play_session.counted_as_play = True
                    play_session.save()
                    
                    # Increment play counts
                    with transaction.atomic():
                        try:
                            play_count = PlayCount.objects.select_for_update().get(
                                user=request.user,
                                music=music
                            )
                            play_count.count += 1
                            play_count.last_played = timezone.now()
                            play_count.save()
                        except PlayCount.DoesNotExist:
                            play_count = PlayCount.objects.create(
                                user=request.user,
                                music=music,
                                count=1,
                                last_played=timezone.now()
                            )
                        
                        music.play_count = F('play_count') + 1
                        music.last_played = timezone.now()
                        music.save()
                
                return Response({
                    'success': True,
                    'counted_as_play': should_count,
                    'accumulated_duration': played_duration
                })
        
        # Standard handling for play tracking without play_id
        should_count = played_duration >= min_duration
        
        # Log for debugging
        print(f"Play completion without play_id: user={request.user.id}, music={music_id}, duration={played_duration}, should_count={should_count}")
        
        # Only increment play counts for legitimate plays
        if should_count:
            # Use transaction.atomic to ensure consistency
            with transaction.atomic():
                # Explicitly get or create the PlayCount with select_for_update
                try:
                    play_count = PlayCount.objects.select_for_update().get(
                        user=request.user,
                        music=music
                    )
                    # Update using direct assignment rather than F expression for debugging
                    play_count.count += 1
                    play_count.last_played = timezone.now()
                    play_count.save()
                    print(f"Updated play count: {play_count.count}")
                except PlayCount.DoesNotExist:
                    play_count = PlayCount.objects.create(
                        user=request.user,
                        music=music,
                        count=1,
                        last_played=timezone.now()
                    )
                    print(f"Created new play count: {play_count.count}")
                
                # Update global music play count directly
                music.play_count = F('play_count') + 1
                music.last_played = timezone.now()
                music.save()
                print(f"Updated music play count")
        
        return Response({
            'success': True,
            'counted_as_play': should_count,
            'accumulated_duration': played_duration
        })
            
    except Exception as e:
        print(f"Error in Record_play_completion: {str(e)}")
        return Response({'error': str(e)}, status=500)





class MusicStreamView(APIView):

    permission_classes = [AllowAny]  
    CHUNK_SIZE = 8192  # 8KB chunks
    RATE_LIMIT_REQUESTS = 2100
    RATE_LIMIT_DURATION = 3600  # 1 hour
    MIN_PLAY_DURATION_SECONDS = 30  # Minimum seconds to count as a play
    MIN_PLAY_PERCENTAGE = 0.3       # Minimum percentage of track to count as a play
    
    @classmethod
    @transaction.atomic
    def save_play_history(cls, user_id, music, played_duration=None):
        """
        Logs the music playback event in the database using atomic transaction.
        Includes validation for counting legitimate plays based on duration or percentage.
        
        Args:
            user_id: ID of the user playing the track
            music: Music object being played
            played_duration: Duration in seconds the track was played (if available)
        
        Returns:
            Boolean indicating if play was counted
        """
        user = get_object_or_404(CustomUser, pk=user_id)
        
        # Anti-duplication: Check for recent plays by this user for this music
        cooldown_period = timezone.now() - timezone.timedelta(minutes=5)
        recent_play = PlayHistory.objects.filter(
            user=user, 
            music=music,
            played_at__gte=cooldown_period
        ).first()
        
        if recent_play:
            # Skip recording this play (it's too soon after the last one)
            return False
        
        # Determine if this should count as a legitimate play
        should_count = True
        if played_duration is not None:
            # If we have duration info, validate based on time or percentage
            min_duration = min(
                cls.MIN_PLAY_DURATION_SECONDS,  
                music.duration * cls.MIN_PLAY_PERCENTAGE if music.duration else float('inf')
            )
            should_count = played_duration >= min_duration
        
        # Create play history entry regardless of duration
        # This gives flexibility to analyze all play attempts later
        play_history = PlayHistory.objects.create(
            user=user, 
            music=music,
            counted_as_play=should_count,
            played_duration=played_duration
        )
        
        # Only increment play count for legitimate plays
        if should_count:
            with transaction.atomic():
                # Update or create play count using select_for_update to prevent race conditions
                play_count, created = PlayCount.objects.select_for_update().get_or_create(
                    user=user,
                    music=music,
                    defaults={'count': 1, 'last_played': timezone.now()}
                )
                
                if not created:
                    # Use F() to avoid race conditions
                    PlayCount.objects.filter(pk=play_count.pk).update(
                        count=F('count') + 1,
                        last_played=timezone.now()
                    )
            
            # Update global music play count
            Music.objects.filter(pk=music.pk).update(
                play_count=F('play_count') + 1,
                last_played=timezone.now()
            )
        
        return should_count
    

        
    def get_content_type(self, file_path):
        ext = os.path.splitext(file_path)[1].lower()
        content_types = {
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".ogg": "audio/ogg",
            ".m4a": "audio/mp4",
            ".aac": "audio/aac",
            ".flac": "audio/flac",
        }
        return content_types.get(ext, "application/octet-stream")

    def check_rate_limit(self, request, user_id):
        cache_key = f"stream_rate_limit_{user_id}"
        rate_limit_data = cache.get(cache_key, {"count": 0, "reset_time": datetime.utcnow()})

        current_time = datetime.utcnow()
        if current_time >= rate_limit_data["reset_time"]:
            rate_limit_data = {
                "count": 1,
                "reset_time": current_time + timedelta(seconds=self.RATE_LIMIT_DURATION)
            }
            cache.set(cache_key, rate_limit_data, timeout=self.RATE_LIMIT_DURATION)
            return True

        if rate_limit_data["count"] < self.RATE_LIMIT_REQUESTS:
            rate_limit_data["count"] += 1
            cache.set(cache_key, rate_limit_data, timeout=self.RATE_LIMIT_DURATION)
            return True

        return False

    def stream_file(self, path, start, end):
        with open(path, 'rb') as f:
            f.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                chunk_size = min(self.CHUNK_SIZE, remaining)
                data = f.read(chunk_size)
                if not data:
                    break
                remaining -= len(data)
                yield data

    def get(self, request, music_id):
        try:
            # Verify the signed token from the query parameter
            signed_token = request.GET.get('token')
            if not signed_token:
                return Response({'error': 'Token required'}, status=401)

            # Verify token
            token_user_id = verify_signed_token(signed_token, music_id, settings.SECRET_KEY)
            if not token_user_id:
                return Response({'error': 'Unauthorized'}, status=401)

            # token_user_id, play_id = token_result

            # Rate limit check
            if not self.check_rate_limit(request, token_user_id):
                return Response({'error': 'Rate limit exceeded'}, status=429)

            music = get_object_or_404(Music, pk=music_id)
            path = music.audio_file.path

            if not os.path.exists(path):
                return Response({'error': 'Audio file not found'}, status=404)


            if not hasattr(request, '_play_initiated'):
                PlayHistory.objects.create(
                    user_id=token_user_id,
                    music_id=music_id,
                    counted_as_play=False,
                    play_status='initiated'
                )
                request._play_initiated = True

            file_size = os.path.getsize(path)
            content_type = self.get_content_type(path)

            # Handle range request
            range_header = request.headers.get('Range')
            start = 0
            end = file_size - 1

            if range_header:
                try:
                    ranges = range_header.replace('bytes=', '').split('-')
                    start = int(ranges[0])
                    if ranges[1]:
                        end = min(int(ranges[1]), file_size - 1)
                except (ValueError, IndexError):
                    return Response({'error': 'Invalid range header'}, status=400)

            # Prepare streaming response
            response = StreamingHttpResponse(
                self.stream_file(path, start, end),
                status=206 if range_header else 200,
                content_type=content_type
            )

            # Set response headers
            response['Accept-Ranges'] = 'bytes'
            response['Content-Length'] = str(end - start + 1)
            if range_header:
                response['Content-Range'] = f'bytes {start}-{end}/{file_size}'

            return response

        except Exception as e:
            print(f"Error streaming audio: {str(e)}")
            return Response({'error': 'Internal server error'}, status=500)

    def options(self, request, *args, **kwargs):
        response = Response()
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Range, Authorization, Content-Type, Accept'
        return response

        

#     # Track play duration with frontend callbacks
# @api_view(['POST'])
# @permission_classes([IsAuthenticated])
# def Record_play_completion(request):
#         """
#         API endpoint for the frontend to report play completion status.
#         This provides more accurate tracking than just stream initiation.
#         """

#         music_id = request.data.get('music_id')
#         played_duration = request.data.get('played_duration')
#         play_percentage = request.data.get('play_percentage')
#         # print(f"Trying to count play: user={request.user.id}, music={music_id}, play_id={play_id}")
#         # print(f"Play meets criteria: {should_count}")
#         if not music_id or (played_duration is None and play_percentage is None):
#             return Response({'error': 'Missing required data'}, status=400)
        
#         try:
#             music = get_object_or_404(Music, pk=music_id)
            
#             # Calculate played duration if only percentage was provided
#             if played_duration is None and play_percentage is not None:
#                 if music.duration:
#                     played_duration = music.duration * float(play_percentage)
#                 else:
#                     # Can't calculate duration without track length
#                     return Response({'error': 'Track duration unknown'}, status=400)
            
#             # Record the play with duration info
#             counted = MusicStreamView.save_play_history(
#                 request.user.id, 
#                 music, 
#                 played_duration=float(played_duration)
#             )
            
#             return Response({
#                 'success': True,
#                 'counted_as_play': counted
#             })
            
#         except Exception as e:
#             return Response({'error': str(e)}, status=500)    



class MusicMetadataView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, music_id):
        try:
            music = get_object_or_404(Music, pk=music_id)



            metadata = {
                "cover_photo": request.build_absolute_uri(music.cover_photo.url) if music.cover_photo else None,
                "duration": music.duration,
                "title": music.name,
                "artist": music.artist.user.email,
                "format": "mp3",
            }
            print(f"Metadata extracted: {metadata}")

            return Response(metadata)
        except Exception as e:
            print(f"Internal Server Error: {e}")
            return Response({"error": str(e)}, status=500)
        
        
            
            
            
            
            
            
##   admin side 
    
    

class MusicVerificationViewSet(viewsets.ModelViewSet):
    serializer_class = MusicVerificationSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        return Music.objects.select_related(
            'artist', 
            'artist__user'
        ).prefetch_related(
            'genres'
        ).order_by('-created_at')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        try:
            music = self.get_object()
            music.approval_status = MusicApprovalStatus.APPROVED
            # music.is_public = True
            music.save()
            
            # Re-serialize the updated object
            serializer = self.get_serializer(music)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        try:
            music = self.get_object()
            music.approval_status = MusicApprovalStatus.REJECTED
            music.save()
            
            # Re-serialize the updated object
            serializer = self.get_serializer(music)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

                    
                   
                   
                   
class EqualizerPresetListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all equalizer presets for the current user"""
        presets = EqualizerPreset.objects.filter(user=request.user)
        serializer = EqualizerPresetSerializer(presets, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Create a new equalizer preset"""
        serializer = EqualizerPresetSerializer(data=request.data)
        if serializer.is_valid():
            # Handle default preset logic
            if serializer.validated_data.get('is_default', False):
                with transaction.atomic():
                    # Set all other presets to non-default
                    EqualizerPreset.objects.filter(
                        user=request.user, 
                        is_default=True
                    ).update(is_default=False)
                    
                    # Create the new default preset
                    serializer.save(user=request.user)
            else:
                serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EqualizerPresetDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk, user):
        return get_object_or_404(EqualizerPreset, pk=pk, user=user)
    
    def get(self, request, pk):
        """Get a specific equalizer preset"""
        preset = self.get_object(pk, request.user)
        serializer = EqualizerPresetSerializer(preset)
        return Response(serializer.data)
    
    def put(self, request, pk):
        """Update a specific equalizer preset"""
        preset = self.get_object(pk, request.user)
        serializer = EqualizerPresetSerializer(preset, data=request.data)
        if serializer.is_valid():
            # Handle default preset logic
            if serializer.validated_data.get('is_default', False):
                with transaction.atomic():
                    # Set all other presets to non-default
                    EqualizerPreset.objects.filter(
                        user=request.user, 
                        is_default=True
                    ).exclude(pk=pk).update(is_default=False)
                    
                    # Update the current preset
                    serializer.save()
            else:
                serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        """Delete a specific equalizer preset"""
        preset = self.get_object(pk, request.user)
        preset.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class CurrentEqualizerView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get the current (default) equalizer preset for the user"""
        try:
            preset = EqualizerPreset.objects.get(user=request.user, is_default=True)
            serializer = EqualizerPresetSerializer(preset)
            return Response(serializer.data)
        except EqualizerPreset.DoesNotExist:
            # Try to get the most recent preset
            try:
                preset = EqualizerPreset.objects.filter(user=request.user).latest('updated_at')
                serializer = EqualizerPresetSerializer(preset)
                return Response(serializer.data)
            except EqualizerPreset.DoesNotExist:
                # Return flat preset
                return Response({
                    'name': 'Flat',
                    'is_default': True,
                    'band_32': 0, 'band_64': 0, 'band_125': 0, 'band_250': 0, 'band_500': 0,
                    'band_1k': 0, 'band_2k': 0, 'band_4k': 0, 'band_8k': 0, 'band_16k': 0
                })
                    