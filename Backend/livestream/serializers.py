from rest_framework import serializers
from users.models import CustomUser

class UserProfileSerializer(serializers.ModelSerializer):
    is_artist = serializers.SerializerMethodField()
    artist_id = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 
            'email', 
            'username', 
            'first_name', 
            'last_name', 
            'full_name',
            'is_artist', 
            'artist_id',
            'profile_photo_url',
            'created_at'
        ]
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()
    
    def get_is_artist(self, obj):
        # Implement your logic to determine if the user is an artist
        # This might depend on your specific Artist model or permission system
        return hasattr(obj, 'artist') and obj.artist is not None
    
    def get_artist_id(self, obj):
        # Implement logic to return artist ID if applicable
        return obj.artist.id if hasattr(obj, 'artist') and obj.artist else None
    
    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            return obj.profile_photo.url
        return None
