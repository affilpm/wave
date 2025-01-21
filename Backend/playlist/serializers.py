# serializers.py
from rest_framework import serializers
from .models import Playlist, PlaylistTrack
from music.serializers import MusicSerializer
from users.serializers import UserSerializer
from music.models import Music
from rest_framework import serializers
from datetime import timedelta
class PlaylistTrackSerializer(serializers.ModelSerializer):
    music_details = MusicSerializer(source='music', read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = PlaylistTrack
        fields = ['id', 'music', 'track_number', 'music_details', 'created_at']
        read_only_fields = ['id', 'created_at']

    # def to_representation(self, instance):
    #     # Add error handling for music details
    #     representation = super().to_representation(instance)
    #     if not representation.get('music_details'):
    #         representation['music_details'] = {
    #             'title': 'Unknown Track',
    #             'duration': 0,
    #             'artist': {'name': 'Unknown Artist'},
    #             # 'album': {'name': 'Unknown Album', 'cover_photo': None}
    #         }
    #     return representation

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
    # def get_duration_formatted(self, obj):
    #     # Assuming 'duration' is a timedelta field
    #     if isinstance(obj.duration, timedelta):
    #         # Format the timedelta as a string, e.g., '3 minutes' or '1 hour 30 minutes'
    #         total_seconds = int(obj.duration.total_seconds())
    #         minutes, seconds = divmod(total_seconds, 60)
    #         hours, minutes = divmod(minutes, 60)
    #         return f"{hours} hours {minutes} minutes" if hours else f"{minutes} minutes"
    #     return str(obj.duration)  # Fallback if not a timedelta    
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
    
    
    
    