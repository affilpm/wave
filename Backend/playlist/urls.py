from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import PlaylistViewSet, MusicService
from . import views

# Initialize the router
router = DefaultRouter()
router.register(r'playlists', PlaylistViewSet, basename='playlist')
router.register(r'music', MusicService, basename='music')

# Get the router URLs
urlpatterns = router.urls

# # Add the search endpoint to urlpatterns
# urlpatterns += [
#     path('search/', views.search_music, name='music-search'),
# ]