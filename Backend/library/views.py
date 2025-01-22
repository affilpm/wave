from django.shortcuts import render

# Create your views here.
# views.py
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Library
from playlist.models import Playlist
from .serializers import LibrarySerializer, PlaylistSerializer, PlaylistDetailSerializer
from django.db.models import Q


# playlist/views.py (updated action method)
class LibraryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = LibrarySerializer

    def get_queryset(self):
        return Library.objects.filter(user=self.request.user)

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

class PlaylistViewSet(viewsets.ModelViewSet):
    queryset = Playlist.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PlaylistDetailSerializer
        return PlaylistSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        # Return public playlists and user's own playlists
        return Playlist.objects.filter(
            Q(is_public=True) | 
            Q(created_by=self.request.user)
        )