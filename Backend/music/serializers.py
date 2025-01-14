from rest_framework import serializers
from .models import Genre, Music
from artists.models import Artist
from users.serializers import UserSerializer
from .models import Album, AlbumTrack, Music
import os

class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ['id', 'name', 'description']
        

class MusicSerializer(serializers.ModelSerializer):
    genres = serializers.PrimaryKeyRelatedField(queryset=Genre.objects.all(), many=True)
    class Meta:
        model = Music
        fields = [
            'id', 'name', 'cover_photo', 'audio_file', 
            'video_file', 'genres', 'release_date',
            'approval_status', 'duration', 'artist','is_public'
        ]

    def validate_cover_photo(self, value):
        # Check the length of the filename
        file_name, file_extension = os.path.splitext(value.name)
        if len(file_name) > 250:
            raise serializers.ValidationError("Ensure this filename has at most 100 characters.")
        return value


    
    
    
    
    
class ArtistSerializer(serializers.ModelSerializer):
    user = UserSerializer()  # Include user data
    
    class Meta:
        model = Artist
        fields = ['id', 'user']
    
    
    
    
    
class MusicVerificationSerializer(serializers.ModelSerializer):
    artist = ArtistSerializer()  # Make sure this includes user data
    status = serializers.CharField(source='approval_status')
    submitted_date = serializers.DateTimeField(source='created_at', format="%Y-%m-%dT%H:%M:%S")
    genres = GenreSerializer(many=True)
    
    class Meta:
        model = Music
        fields = [
            'id',
            'name',
            'artist',
            'genres',
            'status',
            'submitted_date'
        ]









# 