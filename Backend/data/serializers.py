from rest_framework import serializers
from .models import UserMusicHistory, Music

class MusicSerializer(serializers.ModelSerializer):
    artist_name = serializers.CharField(source='artist.user.email', read_only=True)
    genres = serializers.StringRelatedField(many=True)

    class Meta:
        model = Music
        fields = [
            'id', 'name', 'artist_name', 'duration', 'genres', 
            'cover_photo', 'audio_file', 'video_file', 'release_date'
        ]

class UserMusicHistorySerializer(serializers.ModelSerializer):
    music = MusicSerializer(read_only=True)

    class Meta:
        model = UserMusicHistory
        fields = [
            'music', 'play_count', 'last_played_at', 
            'total_listen_time'
        ]
class MusicTrackingSerializer(serializers.ModelSerializer):
    music_name = serializers.CharField(source='music.name', read_only=True)
    artist_name = serializers.CharField(source='music.artist.user.email', read_only=True)

    class Meta:
        model = UserMusicHistory
        fields = [
            'id', 'music', 'music_name', 'artist_name', 
            'play_count', 'total_listen_time', 'last_played_at'
        ]        