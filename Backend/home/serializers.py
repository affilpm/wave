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
        
        
from django.conf import settings
    
    

class ArtistSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.EmailField(source='user.username', read_only=True)
    
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    profile_photo = serializers.ImageField(source='user.profile_photo', read_only=True, allow_null=True, required=False)
    
    
    class Meta:
        model = Artist
        fields = ['id', 'email', 'first_name', 'last_name', 'bio', 'status', 'profile_photo', 'username', 'submitted_at', 'updated_at']
        read_only_fields = ['status', 'submitted_at', 'updated_at']


    def to_representation(self, instance):
        representation = super().to_representation(instance)

        # Check if the request object is available
        request = self.context.get('request', None)
        
        # Check if profile_photo exists and construct the full URL
        if hasattr(instance.user, 'profile_photo') and instance.user.profile_photo:
            if request:
                profile_photo_url = request.build_absolute_uri(instance.user.profile_photo.url)
                representation['profile_photo'] = profile_photo_url
            else:
                representation['profile_photo'] = instance.user.profile_photo.url  # Return the relative URL if no request
        else:
            representation['profile_photo'] = None  # Return null if no profile photo set
        
        return representation