from rest_framework import serializers
from .models import Artist


class ArtistSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    
    class Meta:
        model = Artist
        fields = ['id', 'email', 'first_name', 'last_name', 'bio', 'status', 'submitted_at', 'updated_at']
        read_only_fields = ['status', 'submitted_at', 'updated_at']



