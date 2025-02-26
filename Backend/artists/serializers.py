from rest_framework import serializers
from .models import Artist, Follow
from users.models import CustomUser

class ArtistSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.EmailField(source='user.username', read_only=True)
    
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    profile_photo = serializers.ImageField(source='user.profile_photo', read_only=True, allow_null=True, required=False)
    
    
    class Meta:
        model = Artist
        fields = ['id', 'email', 'first_name', 'last_name', 'bio', 'status', 'profile_photo', 'username', 'submitted_at', 'updated_at']
        read_only_fields = ['status', 'submitted_at', 'updated_at']


    def to_representation(self, instance):
        representation = super().to_representation(instance)

        request = self.context.get('request', None)

        # Check if artist's profile photo exists
        if representation['profile_photo'] is None and hasattr(instance.user, 'profile_photo') and instance.user.profile_photo:
            # Use user's profile photo if artist's profile photo is not set
            if request:
                representation['profile_photo'] = request.build_absolute_uri(instance.user.profile_photo.url)
            else:
                representation['profile_photo'] = instance.user.profile_photo.url
        elif representation['profile_photo'] is None:
            representation['profile_photo'] = None

        return representation
    
    
    

class UserSerializer(serializers.ModelSerializer):
    """Serializer for the CustomUser model"""
    
    class Meta:
        model = CustomUser
        fields = [
            'id',
            'email',
            'username',
            'first_name',
            'last_name',
            'profile_photo',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'email', 'created_at', 'updated_at']

    def to_representation(self, instance):
        """Customize the representation to include the profile photo URL"""
        representation = super().to_representation(instance)
        if instance.profile_photo and hasattr(instance.profile_photo, 'url'):
            representation['profile_photo'] = instance.profile_photo.url
        return representation



class FollowSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    artist = ArtistSerializer(read_only=True)
    
    class Meta:
        model = Follow
        fields = ['id', 'user', 'artist']