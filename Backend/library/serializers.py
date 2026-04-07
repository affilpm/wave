from rest_framework import serializers
from music.models import Music
from playlist.models import Playlist, PlaylistTrack
from users.models import CustomUser

# Music Serializer for Playlist
class MusicInPlaylistSerializer(serializers.ModelSerializer):
    artist_name = serializers.CharField(source='artist.user.username', read_only=True)
    album_name = serializers.SerializerMethodField()
    album_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Music
        fields = [
            'id', 'name', 'duration', 'artist_name', 
            'album_name', 'album_id', 'cover_photo',
        ]

    def get_album_name(self, obj):
        album = obj.albums.first()
        return album.name if album else "Single"

    def get_album_id(self, obj):
        album = obj.albums.first()
        return album.id if album else None


# Playlist Detail Serializer with tracks
class PlaylistDetailSerializer(serializers.ModelSerializer):
    tracks = MusicInPlaylistSerializer(many=True, read_only=True)
    
    class Meta:
        model = Playlist
        fields = ['id', 'name', 'description', 'is_public', 'cover_photo', 
                  'tracks', 'duration', 'created_at', 'created_by']



# Playlist Creator Serializer for user details
class PlaylistCreatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'profile_photo']



class MusicDetailsSerializer(serializers.ModelSerializer):
    artist_name = serializers.CharField(source='artist.user.username', read_only=True)
    album_name = serializers.SerializerMethodField()
    album_id = serializers.SerializerMethodField()
    album_cover = serializers.SerializerMethodField()
    
    class Meta:
        model = Music
        fields = ['id', 'name', 'duration', 'artist_name', 'album_name', 'album_id', 'album_cover']

    def get_album_name(self, obj):
        album = obj.albums.first()
        return album.name if album else "Single"

    def get_album_id(self, obj):
        album = obj.albums.first()
        return album.id if album else None

    def get_album_cover(self, obj):
        album_track = obj.albumtrack_set.first()
        if album_track and album_track.album.cover_photo:
            return album_track.album.cover_photo.url
        return None
        
        
# Playlist Track Serializer for detailed track info
class PlaylistTrackSerializer(serializers.ModelSerializer):
    music_details = MusicDetailsSerializer(source='music')
    
    class Meta:
        model = PlaylistTrack
        fields = ['id', 'track_number', 'music_details']
        
        

# Library Playlist Serializer for library playlists with tracks and creator info
class LibraryPlaylistSerializer(serializers.ModelSerializer):
    cover_photo = serializers.SerializerMethodField()
    created_by_details = PlaylistCreatorSerializer(source='created_by', read_only=True, allow_null=True)

    tracks = PlaylistTrackSerializer(source='playlisttrack_set', many=True)
    
    class Meta:
        model = Playlist
        fields = [
            'id', 'name', 'description', 'is_public', 'cover_photo',
            'created_by_details', 'tracks', 'created_at', 'updated_at'
        ]

    def get_cover_photo(self, obj):
        if obj.cover_photo:
            return obj.cover_photo.url
        return None


class LibraryAlbumSerializer(serializers.Serializer):
    """Serializer for albums saved in the user's library."""

    id = serializers.IntegerField(source='pk')
    name = serializers.CharField()
    cover_photo = serializers.SerializerMethodField()
    artist_username = serializers.SerializerMethodField()
    tracks_count = serializers.SerializerMethodField()
    release_date = serializers.DateTimeField()
    description = serializers.CharField()

    def get_cover_photo(self, obj):
        if obj.cover_photo:
            return obj.cover_photo.url
        return None

    def get_artist_username(self, obj):
        if obj.artist and obj.artist.user:
            return obj.artist.user.username
        return None

    def get_tracks_count(self, obj):
        return obj.albumtrack_set.count()