from django.urls import path
from .views import UserProfileView, generate_livestream_token

urlpatterns = [
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('token/', generate_livestream_token, name='livestream_token'),
]