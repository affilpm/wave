from rest_framework import serializers
from music.models import Music
from playlist.models import Playlist

class MusicSerializer(serializers.ModelSerializer):
    artist = serializers.CharField(source='artist.user.first_name')  # Assuming artist is linked to a user with an email

    class Meta:
        model = Music
        fields = ['id', 'name', 'artist', 'cover_photo']
        
        


class PlaylistSerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField()  # To show email or username
    cover_photo = serializers.ImageField()  # To show the image URL
    duration = serializers.IntegerField()  # Total duration in seconds
    name = serializers.CharField()  # Playlist name

    class Meta:
        model = Playlist
        fields = ['created_by', 'cover_photo', 'duration', 'name']        