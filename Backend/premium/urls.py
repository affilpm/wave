from django.urls import path, include
from .views import CreateRazorpayOrderView, VerifyPaymentView
from rest_framework.routers import DefaultRouter
from .views import PremiumPlanViewSet, UserSubscriptionView, RazorpayTransactionViewSet,CheckSubscriptionStatusViewSet

router = DefaultRouter()
router.register(r'plans', CheckSubscriptionStatusViewSet, basename='premium-plan')
router.register(r'transactions', RazorpayTransactionViewSet, basename='razorpay-transaction')

urlpatterns = [
    path('subscription/', UserSubscriptionView.as_view(), name='user-subscription'),
    path('', include(router.urls)),
    path('create-order/', CreateRazorpayOrderView.as_view(), name='create_order'),
    path('verify-payment/', VerifyPaymentView.as_view(), name='verify_payment'),
]