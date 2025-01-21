from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Prefetch
from .models import Playlist, PlaylistTrack
from .serializers import PlaylistSerializer, PlaylistTrackSerializer
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.files.base import ContentFile


class PlaylistViewSet(viewsets.ModelViewSet):
    serializer_class = PlaylistSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        try:
            # Log the incoming data for debugging
            
            # Create a mutable copy of the data
            data = request.data.copy()
            
            # Handle is_public conversion
            is_public = data.get('is_public', 'true')
            if isinstance(is_public, str):
                data['is_public'] = is_public.lower() == 'true'
            
            serializer = self.get_serializer(data=data)
            if not serializer.is_valid():
                logger.error(f"Validation errors: {serializer.errors}")
                return Response(
                    {
                        'error': 'Invalid data',
                        'details': serializer.errors
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Set the created_by field
            serializer.validated_data['created_by'] = request.user
            
            # Create the playlist
            playlist = serializer.save()
            
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            
            return Response(
                {
                    'error': 'Failed to create playlist',
                    'details': str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    def get_queryset(self):
        return Playlist.objects.filter(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def add_tracks(self, request, pk=None):
        playlist = self.get_object()
        
        # Check if user owns the playlist
        if playlist.created_by != request.user:
            return Response(
                {'error': 'You do not have permission to modify this playlist'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        tracks_data = request.data.get('tracks', [])
        created_tracks = []
        
        try:
            # Get the highest track number
            last_track = PlaylistTrack.objects.filter(playlist=playlist).order_by('-track_number').first()
            next_track_number = (last_track.track_number + 1) if last_track else 1
            
            for track_data in tracks_data:
                music_id = track_data.get('music')
                track = PlaylistTrack.objects.create(
                    playlist=playlist,
                    music_id=music_id,
                    track_number=next_track_number
                )
                created_tracks.append(track)
                next_track_number += 1
                
            # Update playlist duration
            total_duration = sum(track.music.duration for track in created_tracks)
            playlist.duration += total_duration
            playlist.save()
            
            serializer = PlaylistTrackSerializer(created_tracks, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def remove_tracks(self, request, pk=None):
        playlist = self.get_object()
        
        if playlist.created_by != request.user:
            return Response(
                {'error': 'You do not have permission to modify this playlist'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        track_ids = request.data.get('track_ids', [])
        
        try:
            # Get tracks to remove
            tracks_to_remove = PlaylistTrack.objects.filter(
                playlist=playlist,
                id__in=track_ids
            )
            
            # Update playlist duration
            duration_reduction = sum(track.music.duration for track in tracks_to_remove)
            playlist.duration -= duration_reduction
            playlist.save()
            
            # Remove tracks
            tracks_to_remove.delete()
            
            # Reorder remaining tracks
            remaining_tracks = PlaylistTrack.objects.filter(playlist=playlist).order_by('track_number')
            for index, track in enumerate(remaining_tracks, start=1):
                track.track_number = index
                track.save()
                
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )