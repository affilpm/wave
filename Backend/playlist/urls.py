"""Playlist app URL configuration."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from playlist.views import MusicSearchViewSet, PlaylistData, PlaylistViewSet, PublicPlaylistData

router = DefaultRouter()
router.register(r"playlists", PlaylistViewSet, basename="playlist")
router.register(r"playlist-data", PlaylistData, basename="playlistData")
router.register(r"music", MusicSearchViewSet, basename="music")

urlpatterns = router.urls + [
    path("public-playlist-data/", PublicPlaylistData.as_view({"get": "list"}), name="public_playlists"),
    path("public-playlist-data/<int:artistId>/", PublicPlaylistData.as_view({"get": "list"}), name="artist_music_data"),
]