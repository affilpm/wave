from rest_framework import serializers
from music.models import Music, Album
from playlist.models import Playlist
from artists.models import Artist
from users.serializers import UserSerializer

class Music_ListSerializer(serializers.ModelSerializer):
    artist = serializers.SerializerMethodField()
    audio_file = serializers.SerializerMethodField()

    class Meta:
        model = Music
        fields = ['id', 'name', 'artist', 'cover_photo', 'audio_file']

    def get_artist(self, obj):
        return obj.artist.user.username
    
    def get_audio_file(self, obj):
        try:
            if obj.audio_file:
                # Use the full absolute URL instead of just .url
                request = self.context.get('request')
                return request.build_absolute_uri(obj.audio_file.url) if request else obj.audio_file.url
            return None
        except Exception as e:
            # Log the error or print it for debugging
            print(f"Error getting audio file: {e}")
            return None

class Playlist_ListSerializer(serializers.ModelSerializer):
    created_by = serializers.CharField(source='created_by.username', read_only = True)  # To show username
    cover_photo = serializers.ImageField()  # To show the image URL
    duration = serializers.IntegerField()  # Total duration in seconds
    name = serializers.CharField()  # Playlist name

    class Meta:
        model = Playlist
        fields = ['created_by', 'cover_photo', 'duration', 'name', 'id']        
        



class Album_ListSerializer(serializers.ModelSerializer):
    artist = serializers.CharField(source='artist.user.username')  # To show email or username
    cover_photo = serializers.ImageField()  # Cover photo image
    banner_img = serializers.ImageField(required=False)  # Banner image (optional)
    is_public = serializers.BooleanField()  # Whether the album is public

    class Meta:
        model = Album
        fields = ['id', 'name', 'artist', 'cover_photo', 'banner_img', 'is_public']        
        
        
    