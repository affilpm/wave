from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import PlaylistViewSet, MusicService, PlaylistData, PublicPlaylistData

# Initialize the router
router = DefaultRouter()
router.register(r'playlists', PlaylistViewSet, basename='playlist')
router.register(r'playlist_data', PlaylistData, basename='playlistData')
router.register(r'public_playlist_data', PublicPlaylistData, basename='publicplaylistData')


router.register(r'music', MusicService, basename='music')
# router.register(r'playlist-tracks', PlaylistTrackViewSet, basename='playlist-track')
# Get the router URLs
urlpatterns = router.urls

# # Add the search endpoint to urlpatterns
# urlpatterns += [
#     path('search/', views.search_music, name='music-search'),
# ]