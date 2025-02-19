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





from rest_framework.decorators import api_view, permission_classes

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_signed_token(request, music_id):
    from django.conf import settings
    signed_token = generate_signed_token(request.user.id, music_id, settings.SECRET_KEY, expiry_seconds=3600)
    return Response({'token': signed_token})
import os
import time
import hmac
import hashlib
from datetime import datetime, timedelta

from django.conf import settings
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.http import StreamingHttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny  # Changed from IsAuthenticated


# Helper functions (same as before)
from django.conf import settings
import time, hmac, hashlib

def generate_signed_token(user_id, music_id, secret_key, expiry_seconds=3600):
    expiry = int(time.time()) + expiry_seconds
    message = f"{user_id}:{music_id}:{expiry}"
    signature = hmac.new(secret_key.encode(), message.encode(), hashlib.sha256).hexdigest()
    # Format: user_id:music_id:expiry:signature
    return f"{user_id}:{music_id}:{expiry}:{signature}"

# Generate token
token = generate_signed_token(3, 5, settings.SECRET_KEY)
print("Generated Token:", token)

# Verify token
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

print("Verification result:", verify_signed_token(token, 5, settings.SECRET_KEY))


from users.models import CustomUser



class MusicStreamView(APIView):
    # Allow all users, we'll check our signed token manually
    permission_classes = [AllowAny]  
    CHUNK_SIZE = 8192  # 8KB chunks
    RATE_LIMIT_REQUESTS = 2100
    RATE_LIMIT_DURATION = 3600  # 1 hour
    def save_play_history(self, user_id, music):
        """Logs the music playback event in the database."""
        user = get_object_or_404(CustomUser, pk=user_id)
        MusicPlayHistory.objects.create(user=user, music=music, duration_played=0)
        
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

            # verify_signed_token returns the user_id if valid; otherwise False.
            token_user_id = verify_signed_token(signed_token, music_id, settings.SECRET_KEY)
            if not token_user_id:
                return Response({'error': 'Unauthorized'}, status=401)

            if not self.check_rate_limit(request, token_user_id):
                return Response({'error': 'Rate limit exceeded'}, status=429)

            music = get_object_or_404(Music, pk=music_id)
            path = music.audio_file.path

            if not os.path.exists(path):
                return Response({'error': 'Audio file not found'}, status=404)

            if not hasattr(request, '_play_history_saved'):
                self.save_play_history(token_user_id, music)
                request._play_history_saved = True

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

            # CORS headers
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Range, Authorization'
            response['Access-Control-Expose-Headers'] = 'Content-Range, Accept-Ranges, Content-Type'

            return response

        except Exception as e:
            print(f"Error streaming audio: {str(e)}")
            return Response({'error': 'Internal server error'}, status=500)

    def options(self, request, *args, **kwargs):
        response = Response()
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Range, Authorization'
        return response


        
# Recently Played

from django.db.models import Count

class RecentlyPlayedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recent_plays = (
            MusicPlayHistory.objects
            .filter(user=request.user)
            .values('music__id', 'music__name', 'music__artist__user__email')
            .annotate(play_count=Count('id'))
            .order_by('-played_at')[:10]
        )

        data = [
            {
                "music_id": play["music__id"],
                "title": play["music__name"],
                "artist": play["music__artist__user__email"],
                "play_count": play["play_count"],
            }
            for play in recent_plays
        ]
        print(data)
        return Response(data)
    
    



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
        
        
            