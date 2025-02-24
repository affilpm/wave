from rest_framework import serializers
from music.models import Music, Album
from playlist.models import Playlist
from artists.models import Artist
from users.serializers import UserSerializer

class Music_ListSerializer(serializers.ModelSerializer):
    artist = serializers.SerializerMethodField()

    class Meta:
        model = Music
        fields = ['id', 'name', 'artist', 'cover_photo']

    def get_artist(self, obj):
        return obj.artist.user.username
    


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
        
        
    
    

class ArtistSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    profile_photo = serializers.ImageField(source='user.profile_photo', read_only=True)
    
    
    class Meta:
        model = Artist
        fields = ['id', 'email', 'first_name', 'last_name', 'bio', 'status', 'profile_photo', 'submitted_at', 'updated_at']
        read_only_fields = ['status', 'submitted_at', 'updated_at']



    