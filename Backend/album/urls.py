from django.urls import path
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlbumViewSet, MusicViewSet, AlbumData
from . import views

router = DefaultRouter()
router.register(r'albums', AlbumViewSet, basename='album')
router.register(r'music', MusicViewSet, basename='music')
router.register(r'album-data', AlbumData, basename='albumData')

urlpatterns = [
    path('', include(router.urls)),
    
]