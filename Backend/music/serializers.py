from rest_framework import serializers
from .models import Genre, Music
from artists.models import Artist
from .models import Album, AlbumTrack, Music, EqualizerPreset, UserPreference
from users.models import CustomUser

import os

class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ['id', 'name', 'description']
        
class MusicMetadataSerializer(serializers.Serializer):
    duration = serializers.FloatField()
    title = serializers.CharField()
    artist = serializers.CharField(source="artist.email")  
    format = serializers.CharField()        


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = ['preferred_quality'] 
        extra_kwargs = {
            'preferred_quality': {'required': True}    
        }
        
        
class MusicSerializer(serializers.ModelSerializer):
    genres = serializers.PrimaryKeyRelatedField(queryset=Genre.objects.all(), many=True)
    album_id = serializers.IntegerField(required=False, write_only=True)
    track_number = serializers.IntegerField(required=False, write_only=True)
    duration = serializers.DurationField(required=False)

    class Meta:
        model = Music
        fields = [
            'id', 'name', 'cover_photo', 'audio_file', 
            'video_file', 'genres', 'release_date',
            'approval_status', 'duration', 'artist', 'is_public',
            'album_id', 'track_number'
        ]

    def to_representation(self, instance):
        """
        Ensure relative URIs for file fields in the output (for Vite proxy compatibility).
        Remove audio_file from output as requested by user.
        """
        representation = super().to_representation(instance)
        
        # Remove audio_file from public representation to prioritize HLS
        representation.pop('audio_file', None)

        if instance.cover_photo:
            representation['cover_photo'] = instance.cover_photo.url
        if instance.video_file:
            representation['video_file'] = instance.video_file.url
        
        return representation

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
 

    


class UserSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'username']
    
    
    
        
class ArtistSerializer(serializers.ModelSerializer):
    user = UserSerializer()  
    
    class Meta:
        model = Artist
        fields = ['id', 'user']
    
    
    



class MusicDataSerializer(serializers.ModelSerializer):
    artist = ArtistSerializer()  
    duration = serializers.DurationField(required=False)
    album_name = serializers.SerializerMethodField()
    album_id = serializers.SerializerMethodField()

    class Meta:
        model = Music
        fields = [
            'id', 'name', 'cover_photo', 'audio_file', 'release_date',
            'duration', 'artist', 'album_name', 'album_id'
        ]

    def get_album_name(self, obj):
        album = obj.albums.first()
        return album.name if album else "Single"

    def get_album_id(self, obj):
        album = obj.albums.first()
        return album.id if album else None

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Remove audio_file to prioritize HLS
        representation.pop('audio_file', None)
        if instance.cover_photo:
            representation['cover_photo'] = instance.cover_photo.url
        return representation
        
        
        
        
    
class MusicVerificationSerializer(serializers.ModelSerializer):
    artist = ArtistSerializer()  
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
            return obj.audio_file.url
        return None

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.cover_photo:
            representation['cover_photo'] = instance.cover_photo.url
        return representation
    
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