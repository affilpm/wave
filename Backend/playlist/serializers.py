# serializers.py
from rest_framework import serializers
from .models import Playlist, PlaylistTrack
from music.serializers import MusicSerializer
from users.serializers import UserSerializer

class PlaylistTrackSerializer(serializers.ModelSerializer):
    music_details = MusicSerializer(source='music', read_only=True)
    
    class Meta:
        model = PlaylistTrack
        fields = ['id', 'music', 'track_number', 'music_details']
        read_only_fields = ['id']

class PlaylistSerializer(serializers.ModelSerializer):
    tracks = PlaylistTrackSerializer(source='playlisttrack_set', many=True, read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    
    class Meta:
        model = Playlist
        fields = [
            'id', 'name', 'description', 'is_public', 
            'cover_photo', 'duration', 'created_at', 
            'updated_at', 'tracks', 'created_by_details'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_details']
        extra_kwargs = {
            'cover_photo': {'required': False},  # Make cover_photo optional
            'description': {'required': False},  # Make description optional
        }
    def create(self, validated_data):
        # Assign the current user as the creator
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)
    def validate_is_public(self, value):
        # Handle string values from form data
        if isinstance(value, str):
            if value.lower() == 'true':
                return True
            elif value.lower() == 'false':
                return False
        return value