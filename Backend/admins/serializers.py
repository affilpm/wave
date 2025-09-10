from rest_framework import serializers
from django.contrib.auth import authenticate
from users.models import CustomUser
from artists.models import Artist
from users.models import CustomUser
from users.serializers import UserSerializer
from premium.models import PremiumPlan, UserSubscription, RazorpayTransaction
from music.models import Music
from music.serializers import ArtistSerializer, GenreSerializer        
        
class AdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):

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
        
        
        
        




class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'first_name', 'last_name']

class PremiumPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = PremiumPlan
        fields = ['id', 'name', 'price', 'max_users', 'description']

class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PremiumPlanSerializer()
    is_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = UserSubscription
        fields = ['id', 'status', 'started_at', 'expires_at', 'plan', 'is_active', 'razorpay_subscription_id']

class RazorpayTransactionSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    
    class Meta:
        model = RazorpayTransaction
        fields = [
            'id', 'user', 'razorpay_payment_id', 'razorpay_order_id', 
            'amount', 'currency', 'timestamp', 'status'
        ]

class RazorpayTransactionDetailSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    subscription = serializers.SerializerMethodField()
    
    class Meta:
        model = RazorpayTransaction
        fields = [
            'id', 'user', 'razorpay_payment_id', 'razorpay_order_id', 
            'amount', 'currency', 'timestamp', 'status', 'subscription'
        ]
    
    def get_subscription(self, obj):
        try:
            subscription = UserSubscription.objects.get(user=obj.user)
            return SubscriptionSerializer(subscription).data
        except UserSubscription.DoesNotExist:
            return None
        

        
class MusicVerificationSerializer(serializers.ModelSerializer):
    artist = ArtistSerializer()  # Make sure this includes user data
    status = serializers.CharField(source='approval_status')
    submitted_date = serializers.DateTimeField(source='created_at', format="%Y-%m-%dT%H:%M:%S")
    genres = GenreSerializer(many=True)
    audio_url = serializers.SerializerMethodField()
    # video_url = serializers.SerializerMethodField()
    duration_formatted = serializers.SerializerMethodField()

    class Meta:
        model = Music
        fields = [
            'id', 'name', 'artist', 'genres', 'status', 
            'submitted_date', 'audio_url',
            'duration_formatted', 'cover_photo'
        ]
    
    def get_audio_url(self, obj):
        if obj.audio_file:
            return self.context['request'].build_absolute_uri(obj.audio_file.url)
        return None
    
    # def get_video_url(self, obj):
    #     if obj.video_file:
    #         return self.context['request'].build_absolute_uri(obj.video_file.url)
    #     return None
    
    def get_duration_formatted(self, obj):
        if obj.duration:
            minutes = obj.duration.seconds // 60
            seconds = obj.duration.seconds % 60
            return f"{minutes}:{seconds:02d}"
        return None

        