from rest_framework import serializers
from django.utils import timezone
from .models import PremiumPlan, UserSubscription, RazorpayTransaction

class PremiumPlanSerializer(serializers.ModelSerializer):
    features_list = serializers.SerializerMethodField()
    
    class Meta:
        model = PremiumPlan
        fields = [
            'id', 'name', 'duration_days', 'duration_label', 
            'price', 'description', 'features', 'features_list',
            'is_active', 'display_order'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']
    
    def get_features_list(self, obj):
        """
        Convert the pipe-delimited string to a Python list
        """
        if obj.features:
            # Split by pipe character and strip whitespace
            return [feature.strip() for feature in obj.features.split('|') if feature.strip()]
        return []
    
    def to_internal_value(self, data):
        """
        Handle incoming data - convert features list to pipe-delimited string
        """
        incoming_data = data.copy()
        features_list = incoming_data.pop('features_list', None)
        
        # If features_list is provided, convert it to a pipe-delimited string
        if features_list and isinstance(features_list, list):
            if 'features' not in incoming_data:
                incoming_data['features'] = ' | '.join(str(feature) for feature in features_list)
        
        return super().to_internal_value(incoming_data)

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
