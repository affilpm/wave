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



import os
import re
import mimetypes
from mutagen import File
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import StreamingHttpResponse, HttpResponse
from django.shortcuts import get_object_or_404

class MusicStreamView(APIView):
    permission_classes = [IsAuthenticated]

    def get_audio_properties(self, file_path):
        """Get audio file properties using mutagen"""
        try:
            audio = File(file_path)
            if audio is None:
                return None
            
            # Calculate bitrate (bits per second)
            if hasattr(audio.info, 'bitrate'):
                bitrate = audio.info.bitrate
            else:
                # Fallback to a default bitrate of 128kbps if not available
                bitrate = 128 * 1024
            
            return {
                'duration': audio.info.length,  # Duration in seconds
                'bitrate': bitrate  # Bitrate in bits per second
            }
        except Exception:
            return None

    def calculate_chunk_size(self, file_path):
        """Calculate optimal chunk size for 5-second segments"""
        audio_props = self.get_audio_properties(file_path)
        
        if audio_props:
            # Calculate bytes for 5 seconds of audio
            # bitrate is in bits per second, divide by 8 to get bytes per second
            chunk_size = int((audio_props['bitrate'] / 8) * 5)
            # Ensure chunk size is at least 64KB and no more than 1MB
            return max(min(chunk_size, 1024 * 1024), 64 * 1024)
        
        # Default to 256KB chunks if we can't determine audio properties
        return 256 * 1024

    def get(self, request, music_id):
        try:
            music = get_object_or_404(Music, pk=music_id)
            path = music.audio_file.path

            if not os.path.exists(path):
                return Response({"error": "Audio file not found"}, status=404)

            content_type, _ = mimetypes.guess_type(path)
            if not content_type:
                content_type = "audio/mpeg"

            file_size = os.path.getsize(path)
            range_header = request.headers.get("Range", None)
            
            # Calculate chunk size based on audio properties
            chunk_size = self.calculate_chunk_size(path)

            def file_iterator(start, end):
                """Generator to stream file in chunks"""
                with open(path, "rb") as f:
                    f.seek(start)
                    remaining = end - start + 1
                    while remaining > 0:
                        chunk = f.read(min(chunk_size, remaining))
                        if not chunk:
                            break
                        yield chunk
                        remaining -= len(chunk)

            if range_header:
                range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
                if range_match:
                    start, end = range_match.groups()
                    start = int(start)
                    end = int(end) if end else min(start + chunk_size - 1, file_size - 1)

                    if start >= file_size:
                        return HttpResponse(status=416)  # Range Not Satisfiable

                    response = StreamingHttpResponse(
                        file_iterator(start, end),
                        content_type=content_type,
                        status=206
                    )
                    response["Content-Range"] = f"bytes {start}-{end}/{file_size}"
                    response["Content-Length"] = str(end - start + 1)
                else:
                    return HttpResponse(status=400)  # Bad Request
            else:
                # For initial request, send first 5 seconds
                end = chunk_size - 1
                response = StreamingHttpResponse(
                    file_iterator(0, end),
                    content_type=content_type,
                    status=206
                )
                response["Content-Range"] = f"bytes 0-{end}/{file_size}"
                response["Content-Length"] = str(end + 1)

            response["Accept-Ranges"] = "bytes"
            response["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response["Content-Disposition"] = f'inline; filename="{os.path.basename(path)}"'

            return response

        except Exception as e:
            print(f"Streaming error: {str(e)}")
            return Response({"error": "Internal Server Error"}, status=500)
        
    @action(detail=False, methods=['POST'])
    def track_progress(self, request):
        """Track playback progress with validation"""
        try:
            session_id = request.data.get('session_id')
            position = request.data.get('position')
            completed = request.data.get('completed', False)
            
            if not session_id or position is None:
                return Response(
                    {'error': 'session_id and position required'}, 
                    status=400
                )
                
            session = get_object_or_404(
                StreamingSession, 
                session_id=session_id,
                user=request.user
            )
            
            # Validate position
            if position < 0 or position > session.music.duration:
                return Response(
                    {'error': 'Invalid position'}, 
                    status=400
                )
            
            session.last_position = position
            if completed:
                session.completed = True
                session.ended_at = timezone.now()
            session.save()
            
            return Response({'status': 'updated'})
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)