from django.shortcuts import render, get_object_or_404
import subprocess
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
from listening_history.models import PlaySession
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_signed_token(request, music_id):
    """
    a
    """
    
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



def generate_signed_token(user_id, music_id, secret_key, expiry_seconds=3600):
    expiry = int(time.time()) + expiry_seconds
    message = f"{user_id}:{music_id}:{expiry}"
    signature = hmac.new(secret_key.encode(), message.encode(), hashlib.sha256).hexdigest()
    # Format: user_id:music_id:expiry:signature
    return f"{user_id}:{music_id}:{expiry}:{signature}"



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
                if should_count and not play_session.counted_as_play:
                    play_session.status = 'completed'
                    play_session.completed_at = timezone.now()
                    play_session.counted_as_play = True
                    
                    # Update global music play count
                    music.play_count = F('play_count') + 1
                    music.last_played = timezone.now()
                    music.save()
                    print(f"Updated music play count for session completion")
                else:
                    play_session.status = 'in_progress'
                
                play_session.save()
                
                # Log for debugging
                print(f"Play session update: user={request.user.id}, music={music_id}, new_duration={new_total_duration}, should_count={should_count}")
                
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
                    
                    # Update global music play count
                    music.play_count = F('play_count') + 1
                    music.last_played = timezone.now()
                    music.save()
                    print(f"Updated music play count for new completed session")
                
                return Response({
                    'success': True,
                    'counted_as_play': should_count,
                    'accumulated_duration': played_duration
                })
        
        # Standard handling for play tracking without play_id
        # Create a play session with a generated play_id
        import uuid
        generated_play_id = str(uuid.uuid4())
        
        should_count = played_duration >= min_duration
        play_session = PlaySession.objects.create(
            play_id=generated_play_id,
            user=request.user,
            music=music,
            status='in_progress' if not should_count else 'completed',
            duration=played_duration,
            counted_as_play=should_count,
            completed_at=timezone.now() if should_count else None
        )
        
        # Log for debugging
        print(f"Play completion without play_id (created {generated_play_id}): user={request.user.id}, music={music_id}, duration={played_duration}, should_count={should_count}")
        
        # Only increment play count for legitimate plays
        if should_count:
            music.play_count = F('play_count') + 1
            music.last_played = timezone.now()
            music.save()
            print(f"Updated music play count for direct play")
        
        return Response({
            'success': True,
            'counted_as_play': should_count,
            'accumulated_duration': played_duration,
            'play_id': generated_play_id  # Return the generated play_id for future updates
        })
            
    except Exception as e:
        print(f"Error in Record_play_completion: {str(e)}")
        return Response({'error': str(e)}, status=500)





# Add API endpoint to get all available presets
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_equalizer_presets(request):
    """Get all available equalizer presets"""
    presets = EqualizerPreset.objects.all().values(
        'id', 'name', 'description', 
        'band_31', 'band_62', 'band_125', 'band_250', 'band_500',
        'band_1k', 'band_2k', 'band_4k', 'band_8k', 'band_16k'
    )
    return Response(list(presets))


# Add API endpoint to get user's current preset preference
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def user_equalizer_preset(request):
    """Get or set user's equalizer preset preference"""
    if request.method == 'GET':
        preset_id = cache.get(f"user_eq_preset:{request.user.id}", 1)  # Default to Normal (ID 1)
        return Response({'preset_id': preset_id})
    
    elif request.method == 'POST':
        preset_id = request.data.get('preset_id')
        if not preset_id:
            return Response({'error': 'preset_id is required'}, status=400)
        
        # Verify preset exists
        try:
            preset = EqualizerPreset.objects.get(pk=preset_id)
            # Store user preference in cache
            cache.set(f"user_eq_preset:{request.user.id}", preset_id, timeout=None)  # No expiration
            return Response({'success': True, 'preset': {
                'id': preset.id,
                'name': preset.name,
                'description': preset.description
            }})
        except EqualizerPreset.DoesNotExist:
            return Response({'error': 'Preset not found'}, status=404)


# Modified MusicStreamView to support equalization
class MusicStreamView(APIView):
    permission_classes = [AllowAny]  
    CHUNK_SIZE = 8192  # 8KB chunks
    RATE_LIMIT_REQUESTS = 2100
    RATE_LIMIT_DURATION = 3600  # 1 hour
    MIN_PLAY_DURATION_SECONDS = 30  # Minimum seconds to count as a play
    MIN_PLAY_PERCENTAGE = 0.3       # Minimum percentage of track to count as a play
    
    # Directory to store processed audio files
    PROCESSED_AUDIO_DIR = os.path.join(settings.MEDIA_ROOT, 'processed_audio')
    # Cache timeout for processed audio files (1 day)
    PROCESSED_AUDIO_CACHE_TIMEOUT = 86400  
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Ensure the processed audio directory exists
        os.makedirs(self.PROCESSED_AUDIO_DIR, exist_ok=True)
    
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

    def apply_equalizer(self, input_path, user_id, preset_id=None):
        """
        Apply equalizer preset to audio file using FFmpeg
        Returns the path to the processed file
        """
        # If no preset specified, use user's preferred preset or default to Normal
        if not preset_id:
            preset_id = cache.get(f"user_eq_preset:{user_id}", 1)  # Default to Normal (ID 1)
        
        try:
            preset = EqualizerPreset.objects.get(pk=preset_id)
        except EqualizerPreset.DoesNotExist:
            preset = EqualizerPreset.objects.get(name='Normal')
        
        # If Normal preset, just return the original file
        if preset.name == 'Normal' and all(getattr(preset, f'band_{band}') == 0 
                                          for band in ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k']):
            return input_path
            
        # Create a unique filename for the processed file
        file_ext = os.path.splitext(input_path)[1].lower()
        filename = f"{os.path.basename(input_path).split('.')[0]}_eq_{preset.id}{file_ext}"
        output_path = os.path.join(self.PROCESSED_AUDIO_DIR, filename)
        
        # Check if processed file already exists and is recent
        if os.path.exists(output_path):
            # Get file modification time
            mod_time = os.path.getmtime(output_path)
            # If file is not older than cache timeout, return it
            if (datetime.utcnow() - datetime.fromtimestamp(mod_time)).total_seconds() < self.PROCESSED_AUDIO_CACHE_TIMEOUT:
                return output_path
        
        # Get equalizer filter parameters
        eq_filter = preset.get_eq_filter_params()
        
        # Process the audio file using FFmpeg
        try:
            # Build FFmpeg command
            cmd = [
                'ffmpeg',
                '-y',  # Overwrite output file if exists
                '-i', input_path,
                '-af', eq_filter,
                '-c:a', 'libmp3lame' if file_ext == '.mp3' else 'copy',
                output_path
            ]
            
            # Execute FFmpeg command
            subprocess.run(cmd, check=True, capture_output=True)
            return output_path
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            print(f"Error applying equalizer: {str(e)}")
            # If processing fails, return original file
            return input_path

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

            # Get equalizer preset ID from query parameter
            preset_id = request.GET.get('eq')

            # Verify token
            token_user_id = verify_signed_token(signed_token, music_id, settings.SECRET_KEY)
            if not token_user_id:
                return Response({'error': 'Unauthorized'}, status=401)

            # Rate limit check
            if not self.check_rate_limit(request, token_user_id):
                return Response({'error': 'Rate limit exceeded'}, status=429)

            music = get_object_or_404(Music, pk=music_id)
            original_path = music.audio_file.path

            if not os.path.exists(original_path):
                return Response({'error': 'Audio file not found'}, status=404)
            
            # Apply equalizer if requested
            path = self.apply_equalizer(original_path, token_user_id, preset_id)

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

                    
                   
                   
                   
