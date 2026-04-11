from rest_framework import serializers
from .models import ListeningHistory
from music.serializers import MusicDataSerializer
from album.serializers import AlbumSerializer
from artists.serializers import ArtistSerializer

class ListeningHistorySerializer(serializers.ModelSerializer):
    track = MusicDataSerializer(read_only=True)
    album = AlbumSerializer(read_only=True)
    artist = ArtistSerializer(read_only=True)
    
    class Meta:
        model = ListeningHistory
        fields = [
            'id', 'track', 'album', 'artist', 
            'source_type', 'source_id', 
            'last_played_at', 'play_count'
        ]
