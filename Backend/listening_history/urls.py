from django.urls import path
from .views import log_activity


urlpatterns = [
    # path('recently-played/', UserRecentlyPlayedView.as_view(), name='user_recently_played'),
    path('record-activity/<int:music_id>/', log_activity, name='record_activity'),
]
