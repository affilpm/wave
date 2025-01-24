from rest_framework import serializers
from .models import PremiumPlan, UserSubscription, RazorpayTransaction

from rest_framework import serializers
from .models import PremiumPlan, UserSubscription, RazorpayTransaction

class PremiumPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = PremiumPlan
        fields = ['id', 'name', 'price', 'max_users', 'description']

class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan = PremiumPlanSerializer(read_only=True)

    class Meta:
        model = UserSubscription
        fields = ['id', 'user', 'plan', 'razorpay_subscription_id', 'status', 'started_at', 'expires_at']

class RazorpayTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RazorpayTransaction
        fields = ['id', 'user', 'razorpay_payment_id', 'razorpay_order_id', 'amount', 'currency', 'timestamp', 'status']