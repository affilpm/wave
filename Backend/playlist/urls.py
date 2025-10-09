from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import PlaylistViewSet, MusicService, PlaylistData, PublicPlaylistData


router = DefaultRouter()
router.register(r'playlists', PlaylistViewSet, basename='playlist')
router.register(r'playlist-data', PlaylistData, basename='playlistData')
router.register(r'music', MusicService, basename='music')

urlpatterns = router.urls

urlpatterns += [
    path('public-playlist-data/', PublicPlaylistData.as_view({'get': 'list'}), name='public_playlists'),
    path('public-playlist-data/<int:artistId>/', PublicPlaylistData.as_view({'get': 'list'}), name='artist_music_data'),
]