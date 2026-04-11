from django.urls import path
from .views import log_activity, recently_played, jump_back_in


urlpatterns = [
    path('record-activity/<int:music_id>/', log_activity, name='record_activity'),
    path('recently-played/', recently_played, name='recently_played'),
    path('jump-back-in/', jump_back_in, name='jump_back_in'),
]
