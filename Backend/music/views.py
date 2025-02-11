from django.shortcuts import render, get_object_or_404
from .models import Genre, Music
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
            
            # Prepare music data
            music_data = {
                'name': request.data.get('name'),
                'release_date': request.data.get('release_date'),
                'artist': artist.id,
                'genres': request.data.getlist('genres[]'),
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


import os
import time
from datetime import datetime, timedelta
from django.core.cache import cache
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from mutagen.mp3 import MP3

CHUNK_DURATION = 5  # Used for calculating chunk size but shouldn't limit streaming

class MusicStreamView(APIView):
    permission_classes = [IsAuthenticated]
    RATE_LIMIT_REQUESTS = 100
    RATE_LIMIT_DURATION = 3600  # 1 hour
    print(f"Received request for music ID: df")
    def get_content_type(self, file_path):
        ext = os.path.splitext(file_path)[1].lower()
        return {
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".ogg": "audio/ogg",
            ".m4a": "audio/mp4",
            ".aac": "audio/aac",
            ".flac": "audio/flac",
        }.get(ext, "audio/mpeg")

    def check_rate_limit(self, request):
        user_id = request.user.id
        cache_key = f"stream_rate_limit_{user_id}"
        rate_limit_data = cache.get(cache_key, {"count": 0, "reset_time": datetime.utcnow()})

        current_time = datetime.utcnow()
        if current_time >= rate_limit_data["reset_time"]:
            cache.set(cache_key, {"count": 1, "reset_time": current_time + timedelta(seconds=self.RATE_LIMIT_DURATION)}, timeout=self.RATE_LIMIT_DURATION)
            return True

        if rate_limit_data["count"] < self.RATE_LIMIT_REQUESTS:
            rate_limit_data["count"] += 1
            cache.set(cache_key, rate_limit_data, timeout=self.RATE_LIMIT_DURATION)
            return True

        return False

    def get(self, request, music_id):
        print(f"Received request for music ID: {music_id} from {request.user}")  
        if not self.check_rate_limit(request):
            return Response({'error': 'Rate limit exceeded'}, status=429)
        
        music = get_object_or_404(Music, pk=music_id)
        path = music.audio_file.path
        file_size = os.path.getsize(path)
        content_type = self.get_content_type(path)
        bitrate = self._get_bitrate(path)
        chunk_size = self._calculate_chunk_size(bitrate)

        # Extract requested byte range
        range_header = request.headers.get('Range', None)
        start, end = self._get_range(range_header, file_size)

        response = StreamingHttpResponse(
            self._file_iterator(start, end, path, chunk_size),
            status=206 if range_header else 200,
            content_type=content_type
        )
        response["Accept-Ranges"] = "bytes"
        response["Content-Length"] = str(end - start + 1)

        if range_header:
            response["Content-Range"] = f"bytes {start}-{end}/{file_size}"

        response["Cache-Control"] = "public, max-age=31536000"
        return response

    def _file_iterator(self, start, end, path, chunk_size):
        print(f"Streaming file: {path}, Start: {start}, End: {end}")
        with open(path, 'rb') as f:
            f.seek(start)
            while start <= end:
                buffer = f.read(min(chunk_size, end - start + 1))
                if not buffer:
                    print(f"EOF reached at byte {start}")
                    break
                print(f"Sending {len(buffer)} bytes (from {start})")
                yield buffer
                start += len(buffer)
                time.sleep(0.005)  # Reduce to minimize delay

    def _calculate_chunk_size(self, bitrate):
        """Determine chunk size based on bitrate but allow larger playback."""
        return int((bitrate / 8) * CHUNK_DURATION) * 5  # Increase to send more data

    def _get_bitrate(self, path):
        """Retrieve audio bitrate."""
        try:
            audio = MP3(path)
            return audio.info.bitrate
        except Exception:
            return 128000  # Default 128kbps if unknown

    def _get_range(self, range_header, file_size):
        if not range_header:
            print("No Range header found, serving full file")
            return 0, file_size - 1

        try:
            start, end = range_header.replace("bytes=", "").split("-")
            start = int(start) if start else 0
            end = int(end) if end else file_size - 1
            return max(0, start), min(end, file_size - 1)
        except ValueError:
            print("Invalid range request, serving full file")
            return 0, file_size - 1

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