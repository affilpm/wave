from rest_framework import serializers
from django.contrib.auth import authenticate
from users.models import CustomUser
from artists.models import Artist
from users.models import CustomUser


class AdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        # Move authentication to view for better control
        return attrs

class AdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ('id', 'email', 'is_active', 'is_superuser')
        read_only_fields = fields






User = CustomUser

class UserTableSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    joined = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'first_name',
            'last_name',
            'username',
            'is_active',
            'role',
            'joined',
            'profile_photo',
        )

    def get_role(self, obj):
        try:
            artist = obj.artist_profile
            if artist.status == 'approved':
                return 'Artist'
        except Artist.DoesNotExist:
            pass
        return 'User'

    def get_joined(self, obj):
        return obj.created_at.strftime('%b %d, %Y')
    
    
class UserStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('is_active',)    