from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Prefetch
from .models import Playlist, PlaylistTrack, Music
from .serializers import PlaylistSerializer, PlaylistTrackSerializer
from django.db.models import Q
import logging
from .serializers import MusicSerializer
logger = logging.getLogger(__name__)
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from users.models import CustomUser
from artists.models import Artist
from django.db.models import Count

# this view is used search music and add to playlist
class MusicService(viewsets.ModelViewSet):
    serializer_class = MusicSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Music.objects.filter(is_public=True)
        search = self.request.query_params.get('search', None)
        playlist_id = self.request.query_params.get('playlist_id', None)
        
        if search:
            queryset = queryset.filter(name__istartswith=search)
            
        if playlist_id:
            # Exclude tracks that are already in the playlist
            existing_track_ids = PlaylistTrack.objects.filter(
                playlist_id=playlist_id
            ).values_list('music_id', flat=True)
            queryset = queryset.exclude(id__in=existing_track_ids)
            
        return queryset.select_related('artist')
    
class PlaylistData(viewsets.ModelViewSet):
    serializer_class = PlaylistSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Fetch playlists created by the authenticated user
        that only contain public music
        """
        user = self.request.user
        
        # Get all playlists created by the current user
        queryset = Playlist.objects.filter(created_by=user)
        
        # Prefetch related tracks, filtering for only public music
        queryset = queryset.prefetch_related(
            Prefetch(
                'playlisttrack_set',
                queryset=PlaylistTrack.objects.filter(music__is_public=True)
            )
        )
        
        return queryset
        
        
        
class PublicPlaylistData(viewsets.ModelViewSet):
    serializer_class = PlaylistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Fetch playlists created by the authenticated user that are public
        and contain only public music.
        """
        user = self.request.user
        artist_id = self.request.query_params.get('artist_id', None)
        
        if artist_id:
            # Get the User ID associated with the Artist ID
            try:
                artist = Artist.objects.get(id=artist_id)
                artist_user = artist.user
                
                # Get public playlists for the specified artist
                queryset = Playlist.objects.filter(
                    created_by=artist_user, 
                    is_public=True
                )
                
                # Filter for playlists that have at least one song
                queryset = queryset.annotate(
                    track_count=Count('playlisttrack')
                ).filter(track_count__gt=0)
                
                # Prefetch related tracks, filtering for only public music
                queryset = queryset.prefetch_related(
                    Prefetch(
                        'playlisttrack_set',
                        queryset=PlaylistTrack.objects.filter(music__is_public=True)
                    )
                )
                
                return queryset
            except Artist.DoesNotExist:
                # Return empty queryset if artist doesn't exist
                return Playlist.objects.none()
        else:
            # Original behavior: return authenticated user's public playlists
            queryset = Playlist.objects.filter(created_by=user, is_public=True)
            
            # Prefetch related tracks, filtering for only public music
            queryset = queryset.prefetch_related(
                Prefetch(
                    'playlisttrack_set',
                    queryset=PlaylistTrack.objects.filter(music__is_public=True)
                )
            )
            
            return queryset
    
            
# used to manage playlist    
class PlaylistViewSet(viewsets.ModelViewSet):
    serializer_class = PlaylistSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Fetch playlists with proper music visibility rules:
        - For users' playlists, only show public playlists with public tracks
        """
        user = self.request.user
        
        # Base queryset - user can see all their playlists plus public playlists from others
        queryset = Playlist.objects.filter(
            Q(created_by=user) | Q(is_public=True)
        )
        
        # Prefetch related tracks with proper visibility rules
        queryset = queryset.prefetch_related(
            Prefetch(
                'playlisttrack_set',
                queryset=PlaylistTrack.objects.filter(
                    
                    music__is_public=True
                )
            )
        )
        print(queryset)
        return queryset

    
    def create(self, request, *args, **kwargs):
        try:
            if request.data.get('name', '').lower() == 'liked tracks':
                existing_liked_playlist = Playlist.objects.filter(
                    created_by=request.user, 
                    name='Liked Songs'
                ).exists()
                
                if existing_liked_playlist:
                    return Response(
                        {'error': 'You already have a Liked Tracks playlist.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
                return super().create(request, *args, **kwargs)
            data = request.data.copy()
            
            # Handle is_public conversion
            is_public = data.get('is_public', 'true')
            if isinstance(is_public, str):
                data['is_public'] = is_public.lower() == 'true'

            user = request.user
            playlist_name = data.get('name')

            # Check if a playlist with the same name already exists for this user
            if Playlist.objects.filter(name=playlist_name, created_by=user).exists():
                return Response(
                    {'error': 'You already have a playlist with this name.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer = self.get_serializer(data=data)
            if not serializer.is_valid():
                return Response(
                    {'error': 'Invalid data', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer.validated_data['created_by'] = user
            playlist = serializer.save()

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': 'Failed to create playlist', 'details': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    


    @action(detail=True, methods=['post'])
    def add_tracks(self, request, pk=None):
        playlist = self.get_object()
        
        if playlist.created_by != request.user:
            return Response(
                {'error': 'You do not have permission to modify this playlist'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        tracks_data = request.data.get('tracks', [])
        created_tracks = []
        already_existing_tracks = []

        try:
            last_track = PlaylistTrack.objects.filter(playlist=playlist).order_by('-track_number').first()
            next_track_number = (last_track.track_number + 1) if last_track else 1
            
            for track_data in tracks_data:
                music_id = track_data.get('music')
                
                # Check if the track already exists in the playlist
                if PlaylistTrack.objects.filter(playlist=playlist, music_id=music_id).exists():
                    already_existing_tracks.append(music_id)
                    continue  # Skip this track
                
                track = PlaylistTrack.objects.create(
                    playlist=playlist,
                    music_id=music_id,
                    track_number=next_track_number
                )
                created_tracks.append(track)
                next_track_number += 1

            if already_existing_tracks:
                return Response(
                    {'error': f'Track already exist in the playlist.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

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
        
        # Check permissions
        if playlist.created_by != request.user:
            return Response(
                {'error': 'You do not have permission to modify this playlist'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get track IDs from request
        track_ids = request.data.get('track_ids', [])
        if not track_ids:
            return Response(
                {'error': 'No track IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Query tracks to remove
            tracks_to_remove = PlaylistTrack.objects.filter(
                playlist=playlist,
                music_id__in=track_ids  # Changed from id__in to music_id__in
            )
            
            if not tracks_to_remove.exists():
                return Response(
                    {'error': 'No matching tracks found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Calculate duration reduction
            duration_reduction = sum(
                int(track.music.duration.total_seconds())
                for track in tracks_to_remove 
                if track.music and track.music.duration
            )
            
            # Update playlist duration
            if playlist.duration:
                new_duration = max(0, playlist.duration - duration_reduction)
                playlist.duration = new_duration
                playlist.save()
            
            # Delete the tracks
            deleted_count = tracks_to_remove.delete()[0]
            
            # Reorder remaining tracks
            with transaction.atomic():
                remaining_tracks = PlaylistTrack.objects.filter(
                    playlist=playlist
                ).order_by('track_number')
                
                for index, track in enumerate(remaining_tracks, start=1):
                    if track.track_number != index:
                        track.track_number = index
                        track.save()
            
            return Response({
                'message': f'Successfully removed {deleted_count} tracks',
                'new_duration': playlist.duration
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error removing tracks from playlist {playlist.id}: {str(e)}")
            return Response(
                {'error': 'Failed to remove tracks'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
            
    @action(detail=False, methods=['get'])
    def is_liked(self, request):
        """
        Check if a track is already in a users liked playlist
        """        
        try:
            music_id = request.query_params.get('music_id')
            if not music_id:
                return Response(
                    {'error': 'Music ID is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            liked_playlist = Playlist.objects.filter(
                created_by = request.user,
                name='Liked Songs'
            ).first()
            
            if not liked_playlist:
                return Response({'liked': False}, status=status.HTTP_200_OK)
            
            is_liked = PlaylistTrack.objects.filter(
                playlist = liked_playlist,
                music_id = music_id
                
            ).exists()
            
            return Response({'liked': is_liked}, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )    
 
    @action(detail=False, methods=['post'])
    def like_songs(self, request):
        """
        Add or remove a track from the user's Liked Tracks playlist
        """
        try:
            music_id = request.data.get('music_id')
            if not music_id:
                return Response(
                    {'error': 'Music ID is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get or create the Liked Tracks playlist
            liked_playlist, created = Playlist.objects.get_or_create(
                created_by=request.user, 
                name='Liked Songs',
                defaults={
                    'is_public': False,
                    'is_system_created': True,
                    'description': 'Tracks you have liked'
                }
            )
            
            # Check if track is already in Liked Songs
            existing_track = PlaylistTrack.objects.filter(
                playlist=liked_playlist, 
                music_id=music_id
            ).first()
            
            if existing_track:
                # Remove from Liked Songs if it already exists
                existing_track.delete()
                return Response(
                    {'status': 'Track removed from Liked Songs', 'liked': False},
                    status=status.HTTP_200_OK
                )
            else:
                # Determine the next track number
                last_track = PlaylistTrack.objects.filter(playlist=liked_playlist).order_by('-track_number').first()
                next_track_number = (last_track.track_number + 1) if last_track else 1
                
                PlaylistTrack.objects.create(
                    playlist=liked_playlist,
                    music_id=music_id,
                    track_number=next_track_number
                )
                
                return Response(
                    {'status': 'Track added to Liked Songs', 'liked': True},
                    status=status.HTTP_201_CREATED
                )
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
            
            
            

@receiver(post_save, sender=CustomUser)
def create_liked_playlist(sender, instance, created, **kwargs):
    """
    Automatically create a 'Liked Tracks' playlist for new users
    """
    if created:
        try:
            Playlist.objects.create(
                name='Liked Songs',
                created_by=instance,
                is_public=False,
                is_system_created=True,
                description='Tracks you have liked'
            )
        except Exception as e:
            # print(f"Failed to create Liked Tracks playlist for user {instance.username}: {e}")
            pass
    