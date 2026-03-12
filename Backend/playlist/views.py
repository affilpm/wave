"""
Playlist API views — CRUD, track management, liked songs, and signals.
"""

from __future__ import annotations

import logging

from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.db.models.signals import post_save
from django.dispatch import receiver
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from artists.models import Artist
from music.models import Music
from playlist.models import Playlist, PlaylistTrack
from playlist.serializers import MusicSerializer, PlaylistSerializer, PlaylistTrackSerializer
from users.models import CustomUser

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Music search for playlist addition
# ---------------------------------------------------------------------------

class MusicSearchViewSet(viewsets.ModelViewSet):
    """Search public music to add to a playlist."""

    serializer_class = MusicSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Music.objects.filter(is_public=True).select_related("artist", "artist__user")
        search = self.request.query_params.get("search")
        playlist_id = self.request.query_params.get("playlist_id")

        if search:
            qs = qs.filter(name__istartswith=search)

        if playlist_id:
            existing_ids = PlaylistTrack.objects.filter(
                playlist_id=playlist_id,
            ).values_list("music_id", flat=True)
            qs = qs.exclude(id__in=existing_ids)

        return qs


# ---------------------------------------------------------------------------
# Playlist data views (user's own / public)
# ---------------------------------------------------------------------------

class PlaylistData(viewsets.ModelViewSet):
    """User's own playlists (all visibility levels)."""

    serializer_class = PlaylistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Playlist.objects.filter(created_by=self.request.user)
            .prefetch_related(
                Prefetch(
                    "playlisttrack_set",
                    queryset=PlaylistTrack.objects.filter(music__is_public=True),
                )
            )
        )


class PublicPlaylistData(viewsets.ModelViewSet):
    """Public playlists — optionally filtered by artist_id."""

    serializer_class = PlaylistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        artist_id = self.request.query_params.get("artist_id")
        user = self.request.user

        if artist_id:
            try:
                artist = Artist.objects.select_related("user").get(id=artist_id)
            except Artist.DoesNotExist:
                return Playlist.objects.none()

            qs = (
                Playlist.objects.filter(created_by=artist.user, is_public=True)
                .annotate(track_count=Count("playlisttrack"))
                .filter(track_count__gt=0)
            )
        else:
            qs = Playlist.objects.filter(created_by=user, is_public=True)

        return qs.prefetch_related(
            Prefetch(
                "playlisttrack_set",
                queryset=PlaylistTrack.objects.filter(music__is_public=True),
            )
        )


# ---------------------------------------------------------------------------
# Playlist CRUD (with track management actions)
# ---------------------------------------------------------------------------

class PlaylistViewSet(viewsets.ModelViewSet):
    """Full CRUD for playlists with add/remove tracks and like functionality."""

    serializer_class = PlaylistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Playlist.objects.filter(
                Q(created_by=self.request.user) | Q(is_public=True),
            )
            .prefetch_related(
                Prefetch(
                    "playlisttrack_set",
                    queryset=PlaylistTrack.objects.filter(music__is_public=True),
                )
            )
            .distinct()
        )

    def create(self, request, *args, **kwargs):
        """Create a new playlist with duplicate-name checking."""
        name = request.data.get("name", "").strip()

        # Handle "Liked Songs" duplicate check
        if name.lower() == "liked tracks":
            if Playlist.objects.filter(created_by=request.user, name="Liked Songs").exists():
                return Response(
                    {"error": "You already have a Liked Tracks playlist."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return super().create(request, *args, **kwargs)

        data = request.data.copy()
        is_public = data.get("is_public", "true")
        if isinstance(is_public, str):
            data["is_public"] = is_public.lower() == "true"

        if Playlist.objects.filter(name=name, created_by=request.user).exists():
            return Response(
                {"error": "You already have a playlist with this name."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid data", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.validated_data["created_by"] = request.user
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def add_tracks(self, request, pk=None):
        """Add tracks to a playlist (auto-increment track_number)."""
        playlist = self.get_object()
        if playlist.created_by != request.user:
            return Response(
                {"error": "You do not have permission to modify this playlist"},
                status=status.HTTP_403_FORBIDDEN,
            )

        tracks_data = request.data.get("tracks", [])
        last = PlaylistTrack.objects.filter(playlist=playlist).order_by("-track_number").first()
        next_num = (last.track_number + 1) if last else 1
        created_tracks = []

        for entry in tracks_data:
            music_id = entry.get("music")
            if PlaylistTrack.objects.filter(playlist=playlist, music_id=music_id).exists():
                return Response(
                    {"error": "Track already exist in the playlist."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            track = PlaylistTrack.objects.create(
                playlist=playlist, music_id=music_id, track_number=next_num,
            )
            created_tracks.append(track)
            next_num += 1

        return Response(PlaylistTrackSerializer(created_tracks, many=True).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def remove_tracks(self, request, pk=None):
        """Remove tracks and reorder remaining positions."""
        playlist = self.get_object()
        if playlist.created_by != request.user:
            return Response(
                {"error": "You do not have permission to modify this playlist"},
                status=status.HTTP_403_FORBIDDEN,
            )

        track_ids = request.data.get("track_ids", [])
        if not track_ids:
            return Response({"error": "No track IDs provided"}, status=status.HTTP_400_BAD_REQUEST)

        tracks_to_remove = PlaylistTrack.objects.filter(playlist=playlist, music_id__in=track_ids)
        if not tracks_to_remove.exists():
            return Response({"error": "No matching tracks found"}, status=status.HTTP_404_NOT_FOUND)

        # Calculate duration reduction
        duration_reduction = sum(
            int(t.music.duration.total_seconds())
            for t in tracks_to_remove
            if t.music and t.music.duration
        )
        if playlist.duration:
            playlist.duration = max(0, playlist.duration - duration_reduction)
            playlist.save(update_fields=["duration", "updated_at"])

        deleted_count = tracks_to_remove.delete()[0]

        # Reorder remaining tracks
        with transaction.atomic():
            remaining = PlaylistTrack.objects.filter(playlist=playlist).order_by("track_number")
            for idx, track in enumerate(remaining, start=1):
                if track.track_number != idx:
                    track.track_number = idx
                    track.save(update_fields=["track_number"])

        return Response({
            "message": f"Successfully removed {deleted_count} tracks",
            "new_duration": playlist.duration,
        })

    @action(detail=False, methods=["get"])
    def is_liked(self, request):
        """Check if a track is in the user's Liked Songs playlist."""
        music_id = request.query_params.get("music_id")
        if not music_id:
            return Response({"error": "Music ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        liked = Playlist.objects.filter(created_by=request.user, name="Liked Songs").first()
        if not liked:
            return Response({"liked": False})

        return Response({
            "liked": PlaylistTrack.objects.filter(playlist=liked, music_id=music_id).exists(),
        })

    @action(detail=False, methods=["post"])
    def like_songs(self, request):
        """Toggle a track in the user's Liked Songs playlist."""
        music_id = request.data.get("music_id")
        if not music_id:
            return Response({"error": "Music ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        liked_playlist, _ = Playlist.objects.get_or_create(
            created_by=request.user,
            name="Liked Songs",
            defaults={"is_public": False, "is_system_created": True, "description": "Tracks you have liked"},
        )

        existing = PlaylistTrack.objects.filter(playlist=liked_playlist, music_id=music_id).first()
        if existing:
            existing.delete()
            return Response({"status": "Track removed from Liked Songs", "liked": False})

        last = PlaylistTrack.objects.filter(playlist=liked_playlist).order_by("-track_number").first()
        next_num = (last.track_number + 1) if last else 1
        PlaylistTrack.objects.create(playlist=liked_playlist, music_id=music_id, track_number=next_num)
        return Response({"status": "Track added to Liked Songs", "liked": True}, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Signal: auto-create "Liked Songs" playlist for new users
# ---------------------------------------------------------------------------

@receiver(post_save, sender=CustomUser)
def create_liked_playlist(sender, instance, created, **kwargs):
    """Create a 'Liked Songs' playlist for every new user."""
    if created:
        try:
            Playlist.objects.create(
                name="Liked Songs",
                created_by=instance,
                is_public=False,
                is_system_created=True,
                description="Tracks you have liked",
            )
        except Exception:
            logger.exception("Failed to create Liked Songs playlist for user %s", instance.email)