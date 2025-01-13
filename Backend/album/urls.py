from django.urls import path
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlbumViewSet, TrackViewSet
from . import views

router = DefaultRouter()
router.register(r'albums', AlbumViewSet, basename='album')
router.register(r'tracks', TrackViewSet, basename='tracks')



urlpatterns = [
    path('', include(router.urls)),
    
]