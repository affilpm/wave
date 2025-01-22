# serializers.py
from rest_framework import serializers
from playlist.models import Playlist, PlaylistTrack
from .models import Library
from music.serializers import MusicSerializer

class PlaylistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Playlist
        fields = ['id', 'name', 'description', 'is_public', 'cover_photo', 
                 'duration', 'created_at', 'created_by']
        
class PlaylistDetailSerializer(serializers.ModelSerializer):
    tracks = MusicSerializer(many=True, read_only=True)
    
    class Meta:
        model = Playlist
        fields = ['id', 'name', 'description', 'is_public', 'cover_photo', 
                 'tracks', 'duration', 'created_at', 'created_by']

class LibrarySerializer(serializers.ModelSerializer):
    playlists = PlaylistSerializer(many=True, read_only=True)
    
    class Meta:
        model = Library
        fields = ['id', 'user', 'playlists']