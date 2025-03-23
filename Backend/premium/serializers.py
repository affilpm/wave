from rest_framework import serializers
from django.utils import timezone
from .models import PremiumPlan, UserSubscription, RazorpayTransaction

class PremiumPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = PremiumPlan
        fields = [
            'id', 'name', 'duration_days', 'duration_label', 
            'price', 'description', 'features', 
            'is_active', 'display_order'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan = PremiumPlanSerializer(read_only=True)
    days_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = UserSubscription
        fields = [
            'id', 'user', 'plan', 'razorpay_subscription_id', 
            'status', 'started_at', 'expires_at', 'days_remaining'
        ]
    
    def get_days_remaining(self, obj):
        if obj.expires_at and obj.is_active():
            return (obj.expires_at - timezone.now()).days
        return 0

class RazorpayTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RazorpayTransaction
        fields = [
            'id', 'user', 'razorpay_payment_id', 'razorpay_order_id', 
            'amount', 'currency', 'timestamp', 'status'
        ]