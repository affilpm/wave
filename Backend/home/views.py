"""
Home page API views — music listings, artist discovery, playlists, search.
"""

from __future__ import annotations

import logging

from django.db.models import Q
from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from artists.models import Artist
from home.serializers import Album_ListSerializer, ArtistSerializer, Music_ListSerializer, Playlist_ListSerializer
from music.models import Album, Genre, Music, MusicApprovalStatus
from music.serializers import GenreSerializer, MusicDataSerializer
from playlist.models import Playlist
from playlist.serializers import PlaylistSerializer

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

class HomePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


# ---------------------------------------------------------------------------
# Music listings
# ---------------------------------------------------------------------------

class MusicListView(generics.ListAPIView):
    """Public music listing with optional ``?top10`` filter."""

    serializer_class = Music_ListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = HomePagination

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def get_queryset(self):
        qs = (
            Music.objects.filter(is_public=True)
            .select_related("artist", "artist__user")
            .order_by("-created_at")
        )
        if self.request.query_params.get("top10") is not None:
            return qs[:10]
        return qs


# ---------------------------------------------------------------------------
# Playlists
# ---------------------------------------------------------------------------

class PlaylistView(generics.ListAPIView):
    """Public playlists (excludes current user's own)."""

    serializer_class = Playlist_ListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = HomePagination

    def get_queryset(self):
        qs = (
            Playlist.objects.filter(
                is_public=True,
                playlisttrack__music__is_public=True,
            )
            .exclude(created_by=self.request.user)
            .distinct()
            .order_by("-created_at")
        )
        if self.request.query_params.get("top10") is not None:
            return qs[:10]
        return qs


# ---------------------------------------------------------------------------
# Albums
# ---------------------------------------------------------------------------

class AlbumListView(generics.ListAPIView):
    """Public albums containing at least one public track."""

    serializer_class = Album_ListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = HomePagination

    def get_queryset(self):
        qs = (
            Album.objects.filter(
                is_public=True,
                albumtrack__track__is_public=True,
            )
            .select_related("artist", "artist__user")
            .distinct()
            .order_by("-created_at")
        )
        if self.request.query_params.get("top10") is not None:
            return qs[:10]
        return qs


# ---------------------------------------------------------------------------
# Genres
# ---------------------------------------------------------------------------

class PublicGenresViewSet(viewsets.ReadOnlyModelViewSet):
    """Genres that contain at least one public track."""

    queryset = Genre.objects.filter(musical_works__is_public=True).distinct()
    serializer_class = GenreSerializer


@api_view(["GET"])
def get_music_by_genre(request, genre_id: int) -> Response:
    """Paginated listing of approved public tracks in a genre."""
    music = (
        Music.objects.filter(
            genres__id=genre_id,
            approval_status=MusicApprovalStatus.APPROVED,
            is_public=True,
        )
        .select_related("artist__user")
        .order_by("-created_at")
    )
    paginator = HomePagination()
    page = paginator.paginate_queryset(music, request)
    return paginator.get_paginated_response(MusicDataSerializer(page, many=True).data)


# ---------------------------------------------------------------------------
# Artist views
# ---------------------------------------------------------------------------

class ArtistOnlyView(APIView):
    """
    Single artist detail or top-10 artist list (home page).

    - GET /artists/<artist_id>/ — single artist (excludes self)
    - GET /artists/ — top 10 artists with public music
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs) -> Response:
        artist_id = kwargs.get("artist_id")
        if artist_id:
            return self._single_artist(request, artist_id)
        return self._list_artists(request)

    def _single_artist(self, request, artist_id: int) -> Response:
        try:
            artist = Artist.objects.select_related("user").get(id=artist_id)
        except Artist.DoesNotExist:
            return Response({"error": "Artist not found"}, status=status.HTTP_404_NOT_FOUND)

        if artist.user == request.user:
            return Response(
                {"error": "You cannot view your own artist data."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not artist.musical_works.filter(is_public=True).exists():
            return Response(
                {"error": "This artist has no public tracks."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(ArtistSerializer(artist, context={"request": request}).data)

    @staticmethod
    def _list_artists(request) -> Response:
        artists = (
            Artist.objects.exclude(user=request.user)
            .filter(musical_works__is_public=True)
            .select_related("user")
            .distinct()[:10]
        )
        return Response(ArtistSerializer(artists, many=True, context={"request": request}).data)


class ArtistListView(APIView):
    """
    Paginated artist list (or single artist detail).

    Similar to ``ArtistOnlyView`` but with pagination for the full list.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs) -> Response:
        artist_id = kwargs.get("artist_id")
        if artist_id:
            return ArtistOnlyView._single_artist(ArtistOnlyView(), request, artist_id)

        artists = (
            Artist.objects.exclude(user=request.user)
            .filter(musical_works__is_public=True)
            .select_related("user")
            .distinct()
        )
        paginator = HomePagination()
        page = paginator.paginate_queryset(artists, request)
        serializer = ArtistSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


# ---------------------------------------------------------------------------
# Home page playlists
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def home_playlist(request) -> Response:
    """
    Home page playlists: public + user's own + those in the user's library.
    """
    playlists = (
        Playlist.objects.filter(
            Q(is_public=True) | Q(created_by=request.user) | Q(user_libraries__user=request.user),
        )
        .distinct()
        .order_by("-created_at")[:10]
    )
    return Response(PlaylistSerializer(playlists, many=True).data)


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def search_music(request) -> Response:
    """
    Full-text search across track name, artist, and genre.

    Returns track data with streaming URLs attached.
    """
    query = request.GET.get("query", "")
    if not query:
        return Response({"error": "Query parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

    tracks = (
        Music.objects.filter(
            Q(approval_status=MusicApprovalStatus.APPROVED)
            & Q(is_public=True)
            & (
                Q(name__icontains=query)
                | Q(artist__user__username__icontains=query)
                | Q(genres__name__icontains=query)
            ),
        )
        .select_related("artist", "artist__user")
        .prefetch_related("genres")
        .distinct()
    )

    # Serialize with all data in one pass (no N+1)
    results = Music_ListSerializer(tracks, many=True).data
    for item, track_obj in zip(results, tracks):
        item["video_file"] = track_obj.video_file.url if track_obj.video_file else None
        item["artist_id"] = track_obj.artist.id
        item["duration"] = str(track_obj.duration) if track_obj.duration else None

    return Response({"results": results, "count": len(results)})