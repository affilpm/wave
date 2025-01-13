from django.urls import path
from . import views  # Correct import for views from the same app
# from .views import UserDetailView

urlpatterns = [
    # path('register/', RegisterView.as_view(), name='register'),
    # path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    # path('resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    # path('api/auth/google/', GoogleLoginAPIView.as_view(), name='google-login'),
    # path('google_signup/', google_signup, name='google_signup'),
    # path('google_signin/', google_signin, name='google_signin'),
    # path('check_user/', views.check_user, name='check_user'),
    path('google_auth/', views.google_auth, name='google_auth'),
    path('logout/', views.logout, name='logout'),
    
    # path('user/<int:user_id>/', UserDetailView.as_view(), name='user-detail'),
]
    
    