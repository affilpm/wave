# views.py
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import generics
from music.models import Music
from playlist.models import Playlist
from .serializers import MusicSerializer, PlaylistSerializer

class MusicListView(generics.ListAPIView):
    queryset = Music.objects.filter(is_public=True).select_related('artist')
    serializer_class = MusicSerializer
    permission_classes = [IsAuthenticated]  

class PlaylistView(generics.ListAPIView):
    queryset = Playlist.objects.all()
    serializer_class = PlaylistSerializer
    permission_classes = [IsAuthenticated]  