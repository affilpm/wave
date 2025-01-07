from django.urls import path
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GenreViewSet, MusicViewSet, MusicVerificationViewSet, AlbumViewSet, TrackViewSet
from . import views

router = DefaultRouter()
router.register(r'genres', GenreViewSet)
router.register(r'music', MusicViewSet)
router.register(r'music-verification', MusicVerificationViewSet, basename='music-verification')
router.register(r'albums', AlbumViewSet, basename='album')
router.register(r'tracks', TrackViewSet, basename='tracks')



urlpatterns = [
    path('', include(router.urls)),
    
]