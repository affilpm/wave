from rest_framework import serializers
from .models import Genre, Music
from artists.models import Artist
from users.serializers import UserSerializer
import os

class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ['id', 'name', 'description']
        

class MusicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Music
        fields = [
            'id', 'name', 'cover_photo', 'audio_file', 
            'video_file', 'genres', 'release_date',
            'approval_status', 'duration', 'artist'
        ]

    def validate_cover_photo(self, value):
        # Check the length of the filename
        file_name, file_extension = os.path.splitext(value.name)
        if len(file_name) > 250:
            raise serializers.ValidationError("Ensure this filename has at most 100 characters.")
        return value

    def validate(self, data):
        if not data.get('audio_file') and not data.get('video_file'):
            raise serializers.ValidationError(
                "At least one of audio_file or video_file must be provided."
            )
        return data
    
    
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






from rest_framework import serializers
from .models import Album, AlbumTrack, Music


class AlbumTrackSerializer(serializers.ModelSerializer):
    track_details = MusicSerializer(source='track', read_only=True)
    
    class Meta:
        model = AlbumTrack
        fields = ['id', 'track', 'track_number', 'track_details']
        extra_kwargs = {
            'track': {'write_only': True}
        }

class AlbumSerializer(serializers.ModelSerializer):
    tracks = AlbumTrackSerializer(source='albumtrack_set', many=True, required=False)
    
    class Meta:
        model = Album
        fields = [
            'id', 'name', 'description', 'cover_photo', 
            'banner_img', 'release_date', 'status',
            'tracks', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def create(self, validated_data):
        tracks_data = validated_data.pop('albumtrack_set', [])
        album = Album.objects.create(**validated_data)
        
        for track_data in tracks_data:
            AlbumTrack.objects.create(album=album, **track_data)
        
        return album

    def update(self, instance, validated_data):
        tracks_data = validated_data.pop('albumtrack_set', [])
        
        # Update album fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update tracks
        instance.albumtrack_set.all().delete()
        for track_data in tracks_data:
            AlbumTrack.objects.create(album=instance, **track_data)
        
        return instance