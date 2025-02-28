from rest_framework import serializers
from .models import Genre, Music
from artists.models import Artist
from .models import Album, AlbumTrack, Music, EqualizerPreset
from users.models import CustomUser

import os

class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ['id', 'name', 'description']
        
class MusicMetadataSerializer(serializers.Serializer):
    duration = serializers.FloatField()
    title = serializers.CharField()
    artist = serializers.CharField(source="artist.email")  # Adjust this based on what you need
    format = serializers.CharField()        



        
        
class MusicSerializer(serializers.ModelSerializer):
    genres = serializers.PrimaryKeyRelatedField(queryset=Genre.objects.all(), many=True)
    album_id = serializers.IntegerField(required=False, write_only=True)
    track_number = serializers.IntegerField(required=False, write_only=True)
    duration = serializers.DurationField(required=False)  # Add this line

    class Meta:
        model = Music
        fields = [
            'id', 'name', 'cover_photo', 'audio_file', 
            'video_file', 'genres', 'release_date',
            'approval_status', 'duration', 'artist', 'is_public',
            'album_id', 'track_number'
        ]

    def create(self, validated_data):
        album_id = validated_data.pop('album_id', None)
        track_number = validated_data.pop('track_number', None)
        
        # Create the music track with duration included
        music = super().create(validated_data)
        
        if album_id and track_number:
            try:
                album = Album.objects.get(id=album_id)
                AlbumTrack.objects.create(
                    album=album,
                    track=music,
                    track_number=track_number
                )
            except Album.DoesNotExist:
                raise serializers.ValidationError({'album_id': 'Album not found'})
            
        return music
 
# In your view
from rest_framework import generics

class PublicMusicListView(generics.ListAPIView):
    serializer_class = MusicSerializer
    
    def get_queryset(self):
        return Music.objects.filter(is_public=True)    
    


class UserSerializer(serializers.ModelSerializer):
    
    
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'username', 'first_name', 'last_name']
    
        
class ArtistSerializer(serializers.ModelSerializer):
    user = UserSerializer()  # Include user data
    
    class Meta:
        model = Artist
        fields = ['id', 'user']
    
    
    
#

class MusicDataSerializer(serializers.ModelSerializer):
    artist = ArtistSerializer()  # Make sure this includes user data
    genres = serializers.PrimaryKeyRelatedField(queryset=Genre.objects.all(), many=True)
    duration = serializers.DurationField(required=False)  # Add this line

    class Meta:
        model = Music
        fields = [
            'id', 'name', 'cover_photo', 'genres', 'release_date',
            'duration', 'artist'
        ]
        
        
        
        
    
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







class StreamingStatsSerializer(serializers.ModelSerializer):
    total_plays = serializers.IntegerField()
    completed_plays = serializers.IntegerField()
    average_duration = serializers.FloatField()
    
    class Meta:
        model = Music
        fields = ['id', 'name', 'total_plays', 'completed_plays', 'average_duration']


class EqualizerPresetSerializer(serializers.ModelSerializer):
    class Meta:
        model = EqualizerPreset
        fields = [
            'id', 'name', 'is_default', 'created_at', 'updated_at',
            'band_32', 'band_64', 'band_125', 'band_250', 'band_500',
            'band_1k', 'band_2k', 'band_4k', 'band_8k', 'band_16k'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
