from rest_framework import serializers
from music.models import Music, Album
from playlist.models import Playlist

class Music_ListSerializer(serializers.ModelSerializer):
    artist = serializers.CharField(source='artist.user.first_name')  # Assuming artist is linked to a user with an email

    class Meta:
        model = Music
        fields = ['id', 'name', 'artist', 'cover_photo']
        
        


class Playlist_ListSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField()  # To show email or username
    cover_photo = serializers.ImageField()  # To show the image URL
    duration = serializers.IntegerField()  # Total duration in seconds
    name = serializers.CharField()  # Playlist name

    class Meta:
        model = Playlist
        fields = ['created_by', 'cover_photo', 'duration', 'name', 'id']        
        



class Album_ListSerializer(serializers.ModelSerializer):
    artist = serializers.CharField(source='artist.user.first_name')  # To show email or username
    cover_photo = serializers.ImageField()  # Cover photo image
    banner_img = serializers.ImageField(required=False)  # Banner image (optional)
    is_public = serializers.BooleanField()  # Whether the album is public

    class Meta:
        model = Album
        fields = ['name', 'artist', 'cover_photo', 'banner_img', 'is_public']        
        
        
    