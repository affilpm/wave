from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CreateRazorpayOrderView,
    VerifyPaymentView,
    PremiumPlanViewSet,
    UserSubscriptionView,
    CheckSubscriptionStatusView
)

# Create a router for the PremiumPlanViewSet
router = DefaultRouter()
router.register(r'plans', PremiumPlanViewSet, basename='premiumplan')

urlpatterns = [
    path('create-order/', CreateRazorpayOrderView.as_view(), name='create_razorpay_order'),
    path('verify-payment/', VerifyPaymentView.as_view(), name='verify_payment'),
    path('user-subscription/', UserSubscriptionView.as_view(), name='user_subscription'),
    path('check-subscription-status/', CheckSubscriptionStatusView.as_view(), name='check_subscription_status'),
    path('', include(router.urls)),  # Include the routes for PremiumPlanViewSet
]