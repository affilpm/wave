from rest_framework import serializers
from .models import LiveStream, StreamParticipant
from django.contrib.auth import get_user_model
from users.models import CustomUser



class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile_photo']


class StreamParticipantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = StreamParticipant
        fields = ['id', 'user', 'joined_at']


class LiveStreamSerializer(serializers.ModelSerializer):
    host = UserSerializer(read_only=True)
    participant_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = LiveStream
        fields = ['id', 'host', 'channel_name', 'title', 'description', 
                  'status', 'thumbnail', 'created_at', 'updated_at', 
                  'scheduled_start_time', 'participant_count']