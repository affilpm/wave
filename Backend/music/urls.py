from django.urls import path
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GenreViewSet, MusicViewSet, MusicVerificationViewSet, get_music_by_genre, MusicStreamView
router = DefaultRouter()
router.register(r'genres', GenreViewSet)
router.register(r'music', MusicViewSet)
router.register(r'music-verification', MusicVerificationViewSet, basename='music-verification')
# router.register(r'albums', AlbumViewSet, basename='album')
# router.register(r'tracks', TrackViewSet, basename='tracks')



urlpatterns = [
    path('', include(router.urls)),
    path('by-genre/<int:genre_id>/', get_music_by_genre, name='music-by-genre'),
    path('stream/<int:music_id>/', 
         MusicStreamView.as_view(), 
         name='music-stream'),
         
    path('track-progress/', MusicStreamView.as_view(), name='track-progress'),
]