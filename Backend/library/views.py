"""
Library API views — manage saved playlists in the user's library.
"""

from __future__ import annotations

import logging

from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from library.models import Library
from library.serializers import LibraryPlaylistSerializer, PlaylistDetailSerializer
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
    Manage the authenticated user's playlist library.

    Actions: list, check, add, remove playlists.
    """

    permission_classes = [permissions.IsAuthenticated]

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