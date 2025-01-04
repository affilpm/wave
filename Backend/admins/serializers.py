from rest_framework import serializers
from django.contrib.auth import authenticate
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
