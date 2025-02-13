from django.shortcuts import render, get_object_or_404
from .models import Genre, Music, MusicPlayHistory
from .serializers import GenreSerializer, MusicSerializer
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
from .models import Album, StreamingSession
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





class GenreViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    permission_classes = [IsAuthenticated]
    
    




##


class MusicViewSet(ModelViewSet):
    queryset = Music.objects.all()
    serializer_class = MusicSerializer
    parser_classes = (MultiPartParser, FormParser)

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
            
    @action(detail=True)
    def streaming_stats(self, request, pk=None):
            music = self.get_object()
            stats = StreamingSession.objects.filter(music=music).aggregate(
                total_plays=Count('id'),
                completed_plays=Count('id', filter=Q(completed=True)),
                average_duration=Avg('last_position')
            )
            
            serializer = StreamingStatsSerializer({
                'id': music.id,
                'name': music.name,
                **stats
            })
            return Response(serializer.data)    
        
        
        
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
        queryset = Music.objects.filter(
            artist__user=self.request.user,
        ).select_related('artist__user').prefetch_related('genres').order_by('-created_at')

        print(f"Queryset for user {self.request.user}: {queryset}")
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
        

import re
import os

@api_view(['GET'])
def get_music_by_genre(request, genre_id):
    music = Music.objects.filter(
        genres__id=genre_id,
        approval_status=MusicApprovalStatus.APPROVED,
        is_public=True
    ).select_related('artist__user').order_by('-created_at')
    
    serializer = MusicSerializer(music, many=True)
    return Response(serializer.data)
from rest_framework.exceptions import Throttled
import os
import time
from django.core.cache import cache
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from mutagen.mp3 import MP3
from .models import Music
from datetime import datetime, timedelta
import logging

from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_control
from django.core.cache import cache
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, timedelta
import logging
import os

logger = logging.getLogger(__name__)

class MusicStreamView(APIView):
    permission_classes = [IsAuthenticated]
    RATE_LIMIT_REQUESTS = 100
    RATE_LIMIT_DURATION = 3600  # 1 hour
    INITIAL_CHUNK_SIZE = 1024 * 1024  # 1MB for first chunk
    CHUNK_SIZE = 512 * 1024  # 512KB for subsequent chunks
    
    CONTENT_TYPES = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac",
        ".flac": "audio/flac",
    }

    @method_decorator(cache_control(public=True, max_age=31536000))
    def get(self, request, music_id):
        """Handle GET request for music streaming with improved error handling and caching."""
        try:
            if not self._check_rate_limit(request):
                return Response({'error': 'Rate limit exceeded'}, status=429)
            
            music = self._get_music_file(music_id)
            if isinstance(music, Response):  # Error response
                return music
                
            file_info = self._get_file_info(music.audio_file.path)
            if isinstance(file_info, Response):  # Error response
                return file_info
                
            # Handle range request
            range_header = request.headers.get('Range')
            streaming_info = self._handle_range_request(range_header, file_info['size'])
            
            # Record play history asynchronously
            self._record_play_history(request.user, music)
            
            return self._create_streaming_response(
                file_info['path'],
                file_info['content_type'],
                streaming_info
            )
            
        except Exception as e:
            logger.error(f"Error streaming music: {str(e)}", exc_info=True)
            return Response({'error': 'Internal server error'}, status=500)

    def _check_rate_limit(self, request):
        """Enhanced rate limiting with better cache key management."""
        cache_key = f"stream_rate_limit_{request.user.id}"
        current_time = datetime.utcnow()
        
        try:
            rate_data = cache.get_or_set(
                cache_key,
                {
                    "count": 0,
                    "reset_time": current_time + timedelta(seconds=self.RATE_LIMIT_DURATION)
                },
                self.RATE_LIMIT_DURATION
            )
            
            if current_time >= rate_data["reset_time"]:
                rate_data = {
                    "count": 1,
                    "reset_time": current_time + timedelta(seconds=self.RATE_LIMIT_DURATION)
                }
                cache.set(cache_key, rate_data, timeout=self.RATE_LIMIT_DURATION)
                return True
                
            if rate_data["count"] >= self.RATE_LIMIT_REQUESTS:
                return False
                
            rate_data["count"] += 1
            cache.set(cache_key, rate_data, timeout=self.RATE_LIMIT_DURATION)
            return True
            
        except Exception as e:
            logger.error(f"Rate limit check failed: {str(e)}")
            return True  # Fail open to avoid blocking legitimate requests
            
    def _get_music_file(self, music_id):
        """Retrieve music file with validation."""
        try:
            return get_object_or_404(Music, pk=music_id)
        except Exception as e:
            logger.error(f"Error retrieving music file: {str(e)}")
            return Response({'error': 'File not found'}, status=404)

    def _get_file_info(self, file_path):
        """Get file information with validation."""
        if not os.path.exists(file_path):
            return Response({'error': 'File not found'}, status=404)
            
        return {
            'path': file_path,
            'size': os.path.getsize(file_path),
            'content_type': self._get_content_type(file_path)
        }

    def _get_content_type(self, file_path):
        """Determine content type based on file extension."""
        ext = os.path.splitext(file_path)[1].lower()
        return self.CONTENT_TYPES.get(ext, "audio/mpeg")

    def _handle_range_request(self, range_header, file_size):
        """Process range request with validation."""
        if not range_header:
            return {
                'start': 0,
                'end': file_size - 1,
                'status': 200,
                'content_range': None
            }
            
        start, end = self._parse_range_header(range_header, file_size)
        return {
            'start': start,
            'end': end,
            'status': 206,
            'content_range': f"bytes {start}-{end}/{file_size}"
        }

    def _parse_range_header(self, range_header, file_size):
        """Parse range header with improved validation."""
        try:
            range_str = range_header.replace("bytes=", "")
            start_str, end_str = range_str.split("-")
            
            start = int(start_str) if start_str else 0
            end = int(end_str) if end_str else file_size - 1
            
            if start < 0 or end >= file_size or start > end:
                return 0, min(self.INITIAL_CHUNK_SIZE - 1, file_size - 1)
                
            return start, end
            
        except (ValueError, AttributeError):
            return 0, min(self.INITIAL_CHUNK_SIZE - 1, file_size - 1)

    def _create_streaming_response(self, file_path, content_type, streaming_info):
        """Create streaming response with appropriate headers."""
        response = StreamingHttpResponse(
            self._file_iterator(
                streaming_info['start'],
                streaming_info['end'],
                file_path
            ),
            status=streaming_info['status'],
            content_type=content_type
        )
        
        response["Accept-Ranges"] = "bytes"
        response["Content-Length"] = str(streaming_info['end'] - streaming_info['start'] + 1)
        
        if streaming_info['content_range']:
            response["Content-Range"] = streaming_info['content_range']
            
        response["X-Accel-Buffering"] = "yes"
        
        return response

    def _record_play_history(self, user, music):
        """Record play history asynchronously."""
        from django.db import transaction
        transaction.on_commit(
            lambda: MusicPlayHistory.objects.create(user=user, music=music)
        )

    def _file_iterator(self, start, end, path):
        """Optimized file streaming with error handling."""
        remaining = end - start + 1
        bytes_sent = 0
        
        try:
            with open(path, 'rb') as f:
                f.seek(start)
                
                # Initial chunk for faster playback
                if start == 0:
                    initial_chunk = min(self.INITIAL_CHUNK_SIZE, remaining)
                    data = f.read(initial_chunk)
                    if data:
                        bytes_sent += len(data)
                        yield data
                
                # Stream remaining data
                while bytes_sent < remaining:
                    chunk_size = min(self.CHUNK_SIZE, remaining - bytes_sent)
                    data = f.read(chunk_size)
                    
                    if not data:
                        break
                        
                    bytes_sent += len(data)
                    yield data
                    
        except Exception as e:
            logger.error(f"Error during file streaming: {str(e)}", exc_info=True)
            raise




 # For WAV files
# Add more format handlers if needed
# from mutagen.mp3 import MP3

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
        
        
        
        
# Recently Played

class RecentlyPlayedView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self,request):
        recent_plays = MusicPlayHistory.objects.filter(user = request.user).select_related('music').order_by('-played_at')[:10]
        
        data = [
            {
                "music_id": play.music.id,
                "title": play.music.name,
                "artist": play.music.artist.user.email,
                "played_at": play.played_at,
            }
            for play in recent_plays
        ]
        
        return Response(data)