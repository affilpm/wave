from rest_framework import serializers
from music.models import Music, Album
from playlist.models import Playlist
from artists.models import Artist

class Music_ListSerializer(serializers.ModelSerializer):
    artist = serializers.SerializerMethodField()
    artist_id = serializers.SerializerMethodField()
    album_name = serializers.SerializerMethodField()
    album_id = serializers.SerializerMethodField()

    class Meta:
        model = Music
        fields = ['id', 'name', 'artist', 'artist_id', 'cover_photo', 'album_name', 'album_id']

    def get_artist(self, obj):
        return obj.artist.user.username

    def get_artist_id(self, obj):
        return obj.artist.id if obj.artist else None
        
    def get_album_name(self, obj):
        album = obj.albums.first()
        return album.name if album else "Single"

    def get_album_id(self, obj):
        album = obj.albums.first()
        return album.id if album else None
    


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
        
        
from django.conf import settings
    
    

class ArtistSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.EmailField(source='user.username', read_only=True)
    
    profile_photo = serializers.ImageField(source='user.profile_photo', read_only=True, allow_null=True, required=False)
    
    
    class Meta:
        model = Artist
        fields = ['id', 'email', 'bio', 'status', 'profile_photo', 'username', 'submitted_at', 'updated_at']
        read_only_fields = ['status', 'submitted_at', 'updated_at']


    def to_representation(self, instance):
        representation = super().to_representation(instance)

        profile_photo = getattr(instance.user, "profile_photo", None)

        if profile_photo:
            representation["profile_photo"] = profile_photo.url
        else:
            representation["profile_photo"] = None

        return representation