from rest_framework import serializers
from music.models import Music
from playlist.models import Playlist, PlaylistTrack
from library.models import Library
from users.models import CustomUser

# Music Serializer for Playlist
class MusicInPlaylistSerializer(serializers.ModelSerializer):
    artist_name = serializers.CharField(source='artist.name', read_only=True)
    album_name = serializers.CharField(source='album.name', read_only=True)
    
    class Meta:
        model = Music
        fields = [
            'id', 'title', 'duration', 'artist_name', 
            'album_name', 'cover_image', 'audio_file'
        ]

# Playlist Serializer for basic playlist data
class PlaylistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Playlist
        fields = ['id', 'name', 'description', 'is_public', 'cover_photo', 
                  'duration', 'created_at', 'created_by']

# Playlist Detail Serializer with tracks
class PlaylistDetailSerializer(serializers.ModelSerializer):
    tracks = MusicInPlaylistSerializer(many=True, read_only=True)
    
    class Meta:
        model = Playlist
        fields = ['id', 'name', 'description', 'is_public', 'cover_photo', 
                  'tracks', 'duration', 'created_at', 'created_by']

# Library Serializer to include playlists
class LibrarySerializer(serializers.ModelSerializer):
    playlists = PlaylistSerializer(many=True, read_only=True)
    
    class Meta:
        model = Library
        fields = ['id', 'user', 'playlists']

# Playlist Creator Serializer for user details
class PlaylistCreatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'avatar']

# Music Details Serializer for detailed music info
class MusicDetailsSerializer(serializers.ModelSerializer):
    artist_name = serializers.CharField(source='artist.name')
    album_name = serializers.CharField(source='album.name')
    album_cover = serializers.ImageField(source='album.cover_photo')
    
    class Meta:
        model = Music
        fields = ['id', 'title', 'duration', 'artist_name', 'album_name', 'album_cover']

# Playlist Track Serializer for detailed track info
class PlaylistTrackSerializer(serializers.ModelSerializer):
    music_details = MusicDetailsSerializer(source='music')
    
    class Meta:
        model = PlaylistTrack
        fields = ['id', 'track_number', 'created_at', 'music_details']

# Library Playlist Serializer for library playlists with tracks and creator info
class LibraryPlaylistSerializer(serializers.ModelSerializer):
    created_by_details = PlaylistCreatorSerializer(source='created_by')
    tracks = PlaylistTrackSerializer(source='playlisttrack_set', many=True)
    
    class Meta:
        model = Playlist
        fields = [
            'id', 'name', 'description', 'is_public', 'cover_photo',
            'created_by_details', 'tracks', 'created_at', 'updated_at'
        ]