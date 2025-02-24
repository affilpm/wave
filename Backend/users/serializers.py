from rest_framework import serializers
from .models import CustomUser
from rest_framework import serializers
import uuid
from rest_framework import serializers
from .models import CustomUser
from playlist.models import Playlist
from rest_framework import serializers
from django.contrib.auth import get_user_model



User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    profile_photo_url = serializers.SerializerMethodField()
    
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'profile_photo', 'last_name', 'is_active'
                  , 'profile_photo_url']

    def create(self, validated_data):
        temp_password = str(uuid.uuid4())
        user = User.objects.create_user(
            **validated_data,
            password=temp_password  # This is never used since we're using OTP
        )
        return user

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
    
    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            # Get the full URL for the profile photo
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_photo.url)
            return obj.profile_photo.url
        return None
    
    
    
    
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            return User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist.")
        



class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'username', 'profile_photo', 'created_at']
        read_only_fields = ['id', 'email', 'created_at']
    
    def validate_username(self, value):
        """
        Check that the username is unique
        """
        user = self.context['request'].user
        if CustomUser.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError("This username is already in use.")
        return value





class PlaylistSerializer(serializers.ModelSerializer):
    tracks_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Playlist
        fields = [
            'id', 'name', 'description', 'is_public', 
            'cover_photo', 'duration', 'created_at',
            'tracks_count'
        ]
        read_only_fields = ['id', 'created_at']

# class UserSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = CustomUser
#         fields = ['id', 'email', 'username', 'profile_photo', 'created_at']
#         read_only_fields = ['id', 'email', 'created_at']
        