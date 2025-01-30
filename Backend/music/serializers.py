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
    # genres = serializers.SerializerMethodField()

    class Meta:
        model = Music
        fields = [
            'id', 'name', 'cover_photo', 'audio_file', 
            'video_file', 'genres', 'release_date',
            'approval_status', 'duration', 'artist','is_public'
        ]
        
    def get_genres(self, obj):
        # Return a list of genre names
        return [genre.name for genre in obj.genres.all()]
    
    def validate_cover_photo(self, value):
        # Check the length of the filename
        file_name, file_extension = os.path.splitext(value.name)
        if len(file_name) > 250:
            raise serializers.ValidationError("Ensure this filename has at most 100 characters.")
        return value

 
# In your view
from rest_framework import generics

class PublicMusicListView(generics.ListAPIView):
    serializer_class = MusicSerializer
    
    def get_queryset(self):
        return Music.objects.filter(is_public=True)    
    

    
    
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
    audio_url = serializers.SerializerMethodField()
    # video_url = serializers.SerializerMethodField()
    duration_formatted = serializers.SerializerMethodField()

    class Meta:
        model = Music
        fields = [
            'id', 'name', 'artist', 'genres', 'status', 
            'submitted_date', 'audio_url',
            'duration_formatted', 'cover_photo'
        ]
    
    def get_audio_url(self, obj):
        if obj.audio_file:
            return self.context['request'].build_absolute_uri(obj.audio_file.url)
        return None
    
    # def get_video_url(self, obj):
    #     if obj.video_file:
    #         return self.context['request'].build_absolute_uri(obj.video_file.url)
    #     return None
    
    def get_duration_formatted(self, obj):
        if obj.duration:
            minutes = obj.duration.seconds // 60
            seconds = obj.duration.seconds % 60
            return f"{minutes}:{seconds:02d}"
        return None







# 