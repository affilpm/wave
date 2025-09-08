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
import tempfile
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
import traceback
import logging
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
import re
import boto3
import redis
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Music, StreamingFile, HLSQuality, UserPreference
from django.conf import settings
from .throttles import MusicStreamingRateThrottle


class GenreViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    permission_classes = [IsAuthenticated]
    
    
    
    
    
class PublicGenresViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Genre.objects.filter(musical_works__is_public=True).distinct()
    serializer_class = GenreSerializer






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
        preset_id = cache.get(f"user_eq_preset:{request.user.id}", 1) 
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

                    





class MusicStreamingView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [MusicStreamingRateThrottle]

    def get(self, request, music_id):
        try:
            music = get_object_or_404(Music, id=music_id)

            # Check if music is accessible to the user
            if not music.is_public and music.artist.user != request.user:
                return Response(
                    {"error": "You do not have permission to access this music."},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get user's preferred quality (default to LOW)
            try:
                user_preference = UserPreference.objects.get(user=request.user)
                preferred_quality = user_preference.preferred_quality
            except UserPreference.DoesNotExist:
                # Create default preference with LOW quality
                user_preference = UserPreference.objects.create(
                    user=request.user,
                    preferred_quality=HLSQuality.LOW
                )
                preferred_quality = HLSQuality.LOW

            # Get available qualities for this music
            available_qualities = list(
                StreamingFile.objects.filter(music=music)
                .values_list('quality', flat=True)
            )

            # Determine the best quality to use
            quality_to_use = self._get_best_available_quality(preferred_quality, available_qualities)

            if not quality_to_use:
                return Response(
                    {"error": "No streaming files available for this music."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get the streaming file for the determined quality
            streaming_file = get_object_or_404(StreamingFile, music=music, quality=quality_to_use)

            return Response({
                "music_id": music_id,
                "quality_served": quality_to_use,
                "user_preferred_quality": preferred_quality,
                "url": streaming_file.hls_playlist,
                "name": music.name,
                "artist": music.artist.user.email,
                "quality_matched": quality_to_use == preferred_quality,
                "cover_photo": music.cover_photo.url if music.cover_photo else None,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print({str(e)})
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _get_best_available_quality(self, preferred_quality, available_qualities):
        """
        Returns the best available quality based on user preference.
        Falls back to lower quality if preferred is not available.
        """
        if not available_qualities:
            return None

        # If preferred quality is available, use it
        if preferred_quality in available_qualities:
            return preferred_quality

        # Define quality hierarchy (highest to lowest)
        quality_hierarchy = [
            HLSQuality.LOSSLESS,
            HLSQuality.HIGH,
            HLSQuality.MEDIUM,
            HLSQuality.LOW
        ]

        # Find the preferred quality index
        try:
            preferred_index = quality_hierarchy.index(preferred_quality)
        except ValueError:
            # Default to LOW if unknown preferred quality
            preferred_index = 3

        # Try to find the closest lower quality
        for i in range(preferred_index, len(quality_hierarchy)):
            if quality_hierarchy[i] in available_qualities:
                return quality_hierarchy[i]

        # If no lower quality found, try higher qualities
        for i in range(preferred_index - 1, -1, -1):
            if quality_hierarchy[i] in available_qualities:
                return quality_hierarchy[i]

        # Return any available quality as last resort
        return available_qualities[0]


class UserQualityPreferenceView(APIView):
    """View to get and update user preferences"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get user's current preferences"""
        try:
            preference = UserPreference.objects.get(user=request.user)
            return Response({
                "preferred_quality": preference.preferred_quality,
                "available_qualities": [choice[0] for choice in HLSQuality.choices]
            })
        except UserPreference.DoesNotExist:
            # Create default preference with LOW quality
            preference = UserPreference.objects.create(
                user=request.user,
                preferred_quality=HLSQuality.LOW
            )
            return Response({
                "preferred_quality": preference.preferred_quality,
                "available_qualities": [choice[0] for choice in HLSQuality.choices]
            })

    def post(self, request):
        """Update user's preferred quality"""
        preferred_quality = request.data.get('preferred_quality')
        
        valid_qualities = [choice[0] for choice in HLSQuality.choices]
        if preferred_quality not in valid_qualities:
            return Response(
                {"error": f"Invalid quality. Must be one of: {valid_qualities}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        preference, created = UserPreference.objects.get_or_create(
            user=request.user,
            defaults={'preferred_quality': preferred_quality}
        )
        
        if not created:
            preference.preferred_quality = preferred_quality
            preference.save()

        return Response({
            "message": "Preference updated successfully",
            "preferred_quality": preference.preferred_quality
        })