from django.urls import path
from .views import UserRecentlyPlayedView


urlpatterns = [
    path('recently-played/', UserRecentlyPlayedView.as_view(), name='user-recently-played'),
]
