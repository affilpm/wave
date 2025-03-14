from rest_framework import serializers
from users.models import CustomUser
from .models import LiveStream, StreamParticipant
from artists.models import Artist, Follow
from users.serializers import UserSerializer


class ArtistSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    follower_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Artist
        fields = ['id', 'user', 'bio', 'photo', 'banner_photo', 'status', 'follower_count']
    
    def get_follower_count(self, obj):
        return obj.followers.count()


class StreamParticipantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = StreamParticipant
        fields = ['id', 'user', 'joined_at', 'left_at']



class LiveStreamSerializer(serializers.ModelSerializer):
    host = UserSerializer(read_only=True)
    participant_count = serializers.IntegerField(read_only=True)
    is_following = serializers.SerializerMethodField()
    
    class Meta:
        model = LiveStream
        fields = [
            'id', 'host', 'channel_name', 'title', 'description', 
            'thumbnail', 'status', 'started_at', 'ended_at',
            'participant_count', 'is_following'
        ]
        read_only_fields = ['channel_name', 'started_at', 'ended_at', 'status']
    
    def get_is_following(self, obj):
        """Check if the request user follows the stream host"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
            
        if hasattr(obj.host, 'artist_profile'):
            return obj.host.artist_profile.followers.filter(user=request.user).exists()
        return False
    
    def create(self, validated_data):
        """Create a new stream with the current user as host"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Must be authenticated to create streams")
        
        # Set the host to the current user
        validated_data['host'] = request.user
        
        # Generate a unique channel name if not provided
        if 'channel_name' not in validated_data:
            validated_data['channel_name'] = f"stream-{request.user.id}-{int(time.time())}"
            
        return super().create(validated_data)