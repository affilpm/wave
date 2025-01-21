from django.urls import path
from .views import MusicListView, PlaylistView

urlpatterns = [
    path('music/', MusicListView.as_view(), name='music-list'),
    path('playlist/', PlaylistView.as_view(), name='playlist-list'),
    
]