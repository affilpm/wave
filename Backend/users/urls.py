from django.urls import path
from . import views  # Correct import for views from the same app
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # path('register/', RegisterView.as_view(), name='register'),
    # path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    # path('resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    # path('api/auth/google/', GoogleLoginAPIView.as_view(), name='google-login'),
    # path('google_signup/', google_signup, name='google_signup'),
    # path('google_signin/', google_signin, name='google_signin'),
    # path('check_user/', views.check_user, name='check_user'),
    path('google_auth/', views.google_auth, name='google_auth'),
    path('google_pre_register/', views.google_pre_register, name='google_pre_register'),
    
    path('google_register/', views.google_register, name='google_register'),
    
    path('logout/', views.logout, name='logout'),
    path('register/initiate/', views.initiate_registration, name='initiate-registration'),
    path('register/verify-otp/', views.verify_otp, name='verify-otp'),
    path('register/resend-otp/', views.resend_otp, name='resend-otp'),
    
    path('register/complete/', views.complete_registration, name='complete-registration'),
    path('login/', views.login, name='login'),
    path('verify-otp/', views.login_verify_otp, name='login_verify-otp'),
    path('resend-otp/', views.login_resend_otp, name='login_resend-otp'),
    # path('login/', views.login, name='login'),
    # path('verify-otp/', views.verify_otp, name='verify-otp'),
    # path('resend-otp/', views.resend_otp, name='resend-otp'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # path('user/<int:user_id>/', UserDetailView.as_view(), name='user-detail'),
]
    
    