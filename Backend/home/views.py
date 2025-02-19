# views.py
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from music.models import Music, Album
from playlist.models import Playlist
from .serializers import Music_ListSerializer, Playlist_ListSerializer, Album_ListSerializer
from rest_framework.decorators import api_view, permission_classes
from playlist.serializers import PlaylistSerializer
from django.db.models import Q



class MusicListView(generics.ListAPIView):
    serializer_class = Music_ListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_queryset(self):
        # Check if the 'top10' query parameter is present
        top10 = self.request.query_params.get('top10', None)
        all_songs = self.request.query_params.get('all_songs', None)

        if top10 is not None:
            # If 'top10' is present, limit to the top 10 public music items
            return Music.objects.filter(is_public=True).select_related('artist').order_by('-created_at')[:10]
        elif all_songs is not None:
            # If 'all_songs' is present, return all public music items
            return Music.objects.filter(is_public=True).select_related('artist')
        else:
            # Default: return all public music items
            return Music.objects.filter(is_public=True).select_related('artist')
        

    
    
class PlaylistView(generics.ListAPIView):
    queryset = Playlist.objects.filter(is_public=True).exclude(tracks = None) # Fetch public playlists
    serializer_class = Playlist_ListSerializer # Serialize the data
    permission_classes = [IsAuthenticated] # Ensure the user is authenticated
    


class AlbumListView(generics.ListAPIView):
    queryset = Album.objects.filter(is_public=True).exclude(tracks = None)  # Fetch public albums
    serializer_class = Album_ListSerializer # Serialize the data
    permission_classes = [IsAuthenticated] # Serialize the data
    
    


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def home_playlist(request):
    """
    Get playlists for home page:
    - Public playlists
    - User's own playlists
    - Playlists in user's library
    """
    user = request.user
    
    # Get user's library playlists and public playlists
    playlists = Playlist.objects.filter(
        Q(is_public=True) |
        Q(created_by=user) |
        Q(user_libraries__user=user)
    ).distinct().order_by('-created_at')[:10]  # Get latest 10 playlists
    
    serializer = PlaylistSerializer(playlists, many=True)
    return Response(serializer.data)