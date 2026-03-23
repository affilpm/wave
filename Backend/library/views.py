"""
Library API views — manage saved playlists and albums in the user's library.
"""

from __future__ import annotations

import logging

from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from library.models import Library
from library.serializers import LibraryAlbumSerializer, LibraryPlaylistSerializer, PlaylistDetailSerializer
from music.models import Album
from playlist.models import Playlist
from playlist.serializers import PlaylistSerializer

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Playlist read-only
# ---------------------------------------------------------------------------

class PlaylistViewSet(viewsets.ModelViewSet):
    """Read-only access to all playlists (used by library context)."""

    serializer_class = PlaylistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Playlist.objects.all()


# ---------------------------------------------------------------------------
# Library management
# ---------------------------------------------------------------------------

class LibraryViewSet(viewsets.ViewSet):
    """
    Manage the authenticated user's playlist and album library.

    Actions: list, check, add, remove playlists and albums.
    """

    permission_classes = [permissions.IsAuthenticated]

    # -----------------------------------------------------------------------
    # Playlist actions
    # -----------------------------------------------------------------------

    @action(detail=False, methods=["get"], url_path="playlists")
    def get_library_playlists(self, request):
        """Return all playlists saved in the user's library."""
        library = get_object_or_404(Library, user=request.user)
        playlists = library.playlists.all().prefetch_related(
            "tracks", "tracks__artist", "tracks__album",
        )
        return Response(LibraryPlaylistSerializer(playlists, many=True).data)

    @action(detail=False, methods=["get"], url_path=r"check-playlist/(?P<playlist_id>[^/.]+)")
    def check_playlist_in_library(self, request, playlist_id=None):
        """Check whether a playlist is in the user's library."""
        library = get_object_or_404(Library, user=request.user)
        return Response({
            "is_in_library": library.playlists.filter(id=playlist_id).exists(),
        })

    @action(detail=False, methods=["post"])
    def add_playlist(self, request):
        """Add a playlist to the user's library."""
        playlist_id = request.data.get("playlist_id")
        if not playlist_id:
            return Response(
                {"error": "playlist_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        library, _ = Library.objects.get_or_create(user=request.user)
        playlist = get_object_or_404(Playlist, id=playlist_id)

        if playlist.created_by == request.user:
            return Response(
                {"error": "You cannot add your own playlist to the library"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if library.playlists.filter(id=playlist.id).exists():
            return Response(
                {"error": "Playlist is already in your library"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        library.playlists.add(playlist)
        return Response({"message": "Playlist added to library successfully"})

    @action(detail=False, methods=["post"])
    def remove_playlist(self, request):
        """Remove a playlist from the user's library."""
        playlist_id = request.data.get("playlist_id")
        if not playlist_id:
            return Response(
                {"error": "playlist_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        library = get_object_or_404(Library, user=request.user)
        playlist = get_object_or_404(Playlist, id=playlist_id)

        if not library.playlists.filter(id=playlist.id).exists():
            return Response(
                {"error": "Playlist is not in your library"},
                status=status.HTTP_404_NOT_FOUND,
            )

        library.playlists.remove(playlist)
        return Response({"message": "Playlist removed from library successfully"})

    # -----------------------------------------------------------------------
    # Album actions
    # -----------------------------------------------------------------------

    @action(detail=False, methods=["get"], url_path="albums")
    def get_library_albums(self, request):
        """Return all albums saved in the user's library."""
        library = get_object_or_404(Library, user=request.user)
        albums = (
            library.albums.all()
            .select_related("artist", "artist__user")
            .prefetch_related("albumtrack_set")
        )
        return Response(LibraryAlbumSerializer(albums, many=True).data)

    @action(detail=False, methods=["get"], url_path=r"check-album/(?P<album_id>[^/.]+)")
    def check_album_in_library(self, request, album_id=None):
        """Check whether an album is in the user's library."""
        library = get_object_or_404(Library, user=request.user)
        return Response({
            "is_in_library": library.albums.filter(id=album_id).exists(),
        })

    @action(detail=False, methods=["post"], url_path="add-album")
    def add_album(self, request):
        """Save an album to the user's library."""
        album_id = request.data.get("album_id")
        if not album_id:
            return Response(
                {"error": "album_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        library, _ = Library.objects.get_or_create(user=request.user)
        album = get_object_or_404(Album, id=album_id)

        if library.albums.filter(id=album.id).exists():
            return Response(
                {"error": "Album is already in your library"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        library.albums.add(album)
        return Response({"message": "Album added to library successfully"})

    @action(detail=False, methods=["post"], url_path="remove-album")
    def remove_album(self, request):
        """Remove an album from the user's library."""
        album_id = request.data.get("album_id")
        if not album_id:
            return Response(
                {"error": "album_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        library = get_object_or_404(Library, user=request.user)
        album = get_object_or_404(Album, id=album_id)

        if not library.albums.filter(id=album.id).exists():
            return Response(
                {"error": "Album is not in your library"},
                status=status.HTTP_404_NOT_FOUND,
            )

        library.albums.remove(album)
        return Response({"message": "Album removed from library successfully"})


# ---------------------------------------------------------------------------
# Library playlist detail list
# ---------------------------------------------------------------------------

class PlaylistLibraryView(generics.ListAPIView):
    """List only playlists saved in the user's library."""

    serializer_class = PlaylistDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            library = Library.objects.get(user=self.request.user)
            return (
                library.playlists.all()
                .select_related("created_by")
                .prefetch_related("tracks")
            )
        except Library.DoesNotExist:
            return Playlist.objects.none()