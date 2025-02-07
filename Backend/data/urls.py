from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MusicViewSet, 
    UserMusicHistoryViewSet, 
    MusicTrackingViewSet
)

router = DefaultRouter()
router.register(r'music', MusicViewSet, basename='music')
router.register(r'music-history', UserMusicHistoryViewSet, basename='music-history')
router.register(r'music-tracking', MusicTrackingViewSet, basename='music-tracking')

urlpatterns = [
    path('', include(router.urls)),
]