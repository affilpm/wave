from rest_framework import serializers
from music.models import Album, AlbumTrack, Music, Genre
# from music.serializers import MusicSerializer
import os
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets
from artists.serializers import ArtistSerializer
from music.models import Music
 

class MusicSerializer(serializers.ModelSerializer):
    genres = serializers.PrimaryKeyRelatedField(queryset=Genre.objects.all(), many=True)
    artist_email = serializers.SerializerMethodField()
    artist_full_name = serializers.SerializerMethodField()
    artist_username = serializers.SerializerMethodField()
    
    class Meta:
        model = Music
        fields = [
            'id', 'name', 'cover_photo', 
             'genres', 'release_date',
            'approval_status', 'duration', 'artist', 
            'artist_email', 'artist_full_name', 'artist_username',
            'is_public'
        ]

    def get_artist_email(self, obj):
        # Assuming the artist field is related to the User model
        return obj.artist.user.email if obj.artist and obj.artist.user else None

    def get_artist_username(self,obj):
        return obj.artist.user.username if obj.artist and obj.artist.user else None
    
    
    def get_artist_full_name(self, obj):
        # Combine first name and last name
        if obj.artist and obj.artist.user:
            return f"{obj.artist.user.first_name} {obj.artist.user.last_name}".strip()
        return None

    def get_genres(self, obj):
        # Return a list of genre names
        return [genre.name for genre in obj.genres.all()]
    
    def validate_cover_photo(self, value):
        # Check the length of the filename
        file_name, file_extension = os.path.splitext(value.name)
        if len(file_name) > 250:
            raise serializers.ValidationError("Ensure this filename has at most 100 characters.")
        return value
    
    
    
class AlbumTrackSerializer(serializers.ModelSerializer):
    music_details = MusicSerializer(source='track', read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = AlbumTrack
        fields = ['id', 'track', 'track_number', 'music_details', 'created_at']
        read_only_fields = ['id', 'created_at']   


    
   
class AlbumSerializer(serializers.ModelSerializer):
    tracks = AlbumTrackSerializer(source='albumtrack_set', many=True, required=False)
    artist_username = serializers.SerializerMethodField()
    
    class Meta:
        model = Album
        fields = [
            'id', 'name', 'description', 'cover_photo', 
            'banner_img', 'release_date', 'is_public',
            'tracks', 'created_at', 'updated_at',
            'artist_username',
        ]
        read_only_fields = ['created_at', 'updated_at', 'updated_at']
        extra_kwargs = {
            'cover_photo': {'required': False},  # Make cover_photo optional
            'description': {'required': False},  # Make description optional
        }

    def get_tracks_count(self, obj):
        return obj.tracks.count()  
    
    
    def get_artist_username(self,obj):
        return obj.artist.user.username if obj.artist and obj.artist.user else None
    
    
    def validate_is_public(self, value):
        # Handle string values from form data
        if isinstance(value, str):
            if value.lower() == 'true':
                return True
            elif value.lower() == 'false':
                return False
        return value  

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
        