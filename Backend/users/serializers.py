from rest_framework import serializers
from .models import CustomUser
from rest_framework import serializers
from .models import CustomUser
import uuid


from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'is_active']

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
    
    
    
    
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            return User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist.")
    