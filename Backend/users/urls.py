from django.urls import path, include
from . import views  # Correct import for views from the same app
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter



router = DefaultRouter()



urlpatterns = [
    path('', include(router.urls)),
    path('user/', views.get_user, name='get_user'),
    path('update/', views.update_user, name='update_user'),

    path('google-auth/', views.google_auth, name='google_auth'),
    path('google-pre-register/', views.google_pre_register, name='google_pre_register'),
    path('google-register/', views.google_register, name='google_register'),
    
    path('register/initiate/', views.initiate_registration, name='initiate_registration'),
    path('register/verify-otp/', views.verify_otp, name='verify_otp'),
    path('register/resend-otp/', views.resend_otp, name='resend_otp'),
    path('register/complete/', views.complete_registration, name='complete_registration'),
    
    path('login/', views.login, name='login'),
    path('verify-otp/', views.login_verify_otp, name='login_verify_otp'),
    path('resend-otp/', views.login_resend_otp, name='login_resend_otp'),

    path('logout/', views.logout, name='logout'),

    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

]
    
    