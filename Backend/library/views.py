from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Library
from playlist.models import Playlist
from .serializers import LibraryPlaylistSerializer
from playlist.serializers import PlaylistSerializer
from rest_framework import generics
from .serializers import PlaylistDetailSerializer


class PlaylistViewSet(viewsets.ModelViewSet):
    serializer_class = PlaylistSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Fetch playlists created by the authenticated user
        return Playlist.objects.all()
    
    
    
class LibraryViewSet(viewsets.ViewSet):
    
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['GET'], url_path='playlists')
    def get_library_playlists(self, request):
        library = get_object_or_404(Library, user=request.user)
        playlists = library.playlists.all().prefetch_related(
            'tracks',
            'tracks__artist',
            'tracks__album'
        )
        serializer = LibraryPlaylistSerializer(playlists, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['GET'], url_path='check-playlist/(?P<playlist_id>[^/.]+)')
    def check_playlist_in_library(self, request, playlist_id=None):
        library = get_object_or_404(Library, user=request.user)
        is_in_library = library.playlists.filter(id=playlist_id).exists()
        return Response({'is_in_library': is_in_library}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def add_playlist(self, request):
        playlist_id = request.data.get('playlist_id')
        if not playlist_id:
            return Response(
                {'error': 'playlist_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Get or create library for the user
            library, created = Library.objects.get_or_create(user=request.user)
            
            # Get the playlist
            playlist = get_object_or_404(Playlist, id=playlist_id)
            
            # Check if the playlist was created by the user
            if playlist.created_by == request.user:
                return Response(
                    {'error': 'You cannot add your own playlist to the library'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if playlist is already in library
            if playlist in library.playlists.all():
                return Response(
                    {'error': 'Playlist is already in your library'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Add playlist to library
            library.playlists.add(playlist)
            
            return Response(
                {'message': 'Playlist added to library successfully'}, 
                status=status.HTTP_200_OK
            )
        except Playlist.DoesNotExist:
            return Response(
                {'error': 'Playlist not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
    @action(detail=False, methods=['post'])
    def remove_playlist(self, request):
        playlist_id = request.data.get('playlist_id')
        if not playlist_id:
            return Response(
                {'error': 'playlist_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            library = get_object_or_404(Library, user=request.user)
            playlist = get_object_or_404(Playlist, id=playlist_id)
            
            if playlist not in library.playlists.all():
                return Response(
                    {'error': 'Playlist is not in your library'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            library.playlists.remove(playlist)
            return Response(
                {'message': 'Playlist removed from library successfully'}, 
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )




class PlaylistLibraryView(generics.ListAPIView):
    """
    Fetch only the playlists that are in the user's library.
    """
    serializer_class = PlaylistDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Returns only playlists that are in the user's library.
        """
        user = self.request.user
        
        # Get the user's library playlists through the Library model
        try:
            library = Library.objects.get(user=user)
            return library.playlists.all()\
                .select_related('created_by')\
                .prefetch_related('tracks')
        except Library.DoesNotExist:
            return Playlist.objects.none()