"""
Music API views — streaming, track management, equalizer presets.

All query-heavy logic delegates to ``music.services``.
"""

from __future__ import annotations

import logging

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Q, Value, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.generics import UpdateAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from music.models import (
    Album,
    AlbumTrack,
    EqualizerPreset,
    Genre,
    HLSQuality,
    Music,
    MusicApprovalStatus,
    StreamingFile,
    UserPreference,
)
from music.serializers import (
    GenreSerializer,
    MusicDataSerializer,
    MusicSerializer,
    MusicVerificationSerializer,
    UserPreferenceSerializer,
)
from music.services import MusicService, StreamingService
from music.throttles import MusicStreamingRateThrottle
from premium.models import UserSubscription

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Genre views
# ---------------------------------------------------------------------------

class GenreViewSet(viewsets.ReadOnlyModelViewSet):
    """List all genres (authenticated users)."""

    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    permission_classes = [IsAuthenticated]


class PublicGenresViewSet(viewsets.ReadOnlyModelViewSet):
    """List genres that have at least one public track."""

    queryset = Genre.objects.filter(musical_works__is_public=True).distinct()
    serializer_class = GenreSerializer


# ---------------------------------------------------------------------------
# Track listing views
# ---------------------------------------------------------------------------

class PublicSongsView(generics.ListAPIView):
    """List the current user's own approved, public tracks."""

    serializer_class = MusicDataSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Music.objects.filter(
                artist__user=self.request.user,
                is_public=True,
                approval_status=MusicApprovalStatus.APPROVED,
            )
            .select_related("artist", "artist__user")
            .order_by("-release_date")
        )


class SongsByArtistView(generics.ListAPIView):
    """List approved, public tracks by a specific artist."""

    serializer_class = MusicDataSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        artist_id = self.kwargs.get("artist_id")
        return (
            Music.objects.filter(
                artist__id=artist_id,
                is_public=True,
                approval_status=MusicApprovalStatus.APPROVED,
            )
            .select_related("artist", "artist__user")
            .order_by("-release_date")
        )


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

class MusicPagination(PageNumberPagination):
    page_size = 8
    page_size_query_param = "page_size"
    max_page_size = 100


# ---------------------------------------------------------------------------
# Music CRUD ViewSet
# ---------------------------------------------------------------------------

class MusicViewSet(ModelViewSet):
    """Full CRUD for an artist's own tracks."""

    queryset = Music.objects.all()
    serializer_class = MusicSerializer
    parser_classes = (MultiPartParser, FormParser)
    pagination_class = MusicPagination

    def get_queryset(self):
        queryset = (
            Music.objects.filter(artist__user=self.request.user)
            .select_related("artist", "artist__user", "play_stats")
            .prefetch_related("genres")
            .annotate(
                annotated_total_plays=Coalesce("play_stats__total_plays", Value(0))
            )
            .order_by("-created_at")
        )
        search_term = self.request.query_params.get("search", "")
        if search_term:
            queryset = queryset.filter(Q(name__icontains=search_term)).distinct()
        return queryset

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a new track, optionally assigning it to an album."""
        try:
            artist = request.user.artist_profile
            duration = self._parse_duration(request.data.get("duration"))

            music_data = {
                "name": request.data.get("name"),
                "release_date": request.data.get("release_date"),
                "artist": artist.id,
                "genres": request.data.getlist("genres[]"),
                "duration": duration,
                **{
                    field: request.FILES[field]
                    for field in ("audio_file", "cover_photo", "video_file")
                    if field in request.FILES
                },
            }

            serializer = self.get_serializer(data=music_data)
            if not serializer.is_valid():
                return Response(
                    {"error": "Validation failed", "details": serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            music_track = serializer.save()
            self._assign_to_album(request, artist, music_track)

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ValidationError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            logger.exception("Error creating track")
            return Response(
                {"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        """Delete a track and its associated media files."""
        instance = self.get_object()
        for field_name in ("audio_file", "video_file", "cover_photo"):
            field = getattr(instance, field_name, None)
            if field:
                field.delete(save=False)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def check_name(self, request):
        """Check if a track name already exists for this artist."""
        name = request.query_params.get("name", "").strip()
        artist = request.user.artist_profile
        exists = Music.objects.filter(name__iexact=name, artist=artist).exists()
        return Response({"exists": exists})

    @action(detail=True, methods=["post"])
    def toggle_visibility(self, request, pk=None):
        """Toggle the is_public flag on a track."""
        music = self.get_object()
        
        # Prevent making a track public if HLS processing isn't finished
        if not music.is_public and not music.streaming_files.exists():
            return Response(
                {"error": "Cannot make track public until HLS processing is complete."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        music.is_public = not music.is_public
        music.save(update_fields=["is_public", "updated_at"])
        return Response({"is_public": music.is_public})

    # --- Helpers ---

    @staticmethod
    def _parse_duration(duration_str: str | None):
        """Parse an ISO 8601 duration string, returning None on failure."""
        if not duration_str:
            return None
        try:
            import isodate
            return isodate.parse_duration(duration_str)
        except (ValueError, TypeError) as exc:
            raise ValidationError(f"Invalid duration format: {exc}")

    @staticmethod
    def _assign_to_album(request, artist, music_track):
        """Optionally assign a track to an album at a given position."""
        album_id = request.data.get("album")
        track_number = request.data.get("track_number")
        if not album_id or not track_number:
            return
        album = Album.objects.select_for_update().get(id=album_id, artist=artist)
        if AlbumTrack.objects.filter(album=album, track_number=track_number).exists():
            raise ValidationError("Track number already exists in this album")
        AlbumTrack.objects.create(
            album=album, track=music_track, track_number=int(track_number)
        )


# ---------------------------------------------------------------------------
# Equalizer presets
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_equalizer_presets(request) -> Response:
    """Return all available equalizer presets."""
    presets = EqualizerPreset.objects.all().values(
        "id", "name", "description",
        "band_31", "band_62", "band_125", "band_250", "band_500",
        "band_1k", "band_2k", "band_4k", "band_8k", "band_16k",
    )
    return Response(list(presets))


def _is_user_premium(user) -> bool:
    """Helper to check if a user has an active premium subscription."""
    try:
        return user.subscription.status == "active"
    except UserSubscription.DoesNotExist:
        return False


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def user_equalizer_preset(request) -> Response:
    """Get or set the user's preferred equalizer preset."""
    cache_key = f"user_eq_preset:{request.user.id}"
    is_premium = _is_user_premium(request.user)

    if request.method == "GET":
        # Even non-premium can GET (defaults to normal), but they can't change it.
        # However, for consistency with the "Premium Only" requirement, 
        # let's return a default if not premium.
        preset_id = cache.get(cache_key, 1) if is_premium else 1
        return Response({"preset_id": preset_id})

    # POST - Set preset (Premium Only)
    if not is_premium:
        return Response(
            {"error": "Premium subscription required to use the equalizer."},
            status=status.HTTP_403_FORBIDDEN
        )

    preset_id = request.data.get("preset_id")
    if not preset_id:
        return Response({"error": "preset_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        preset = EqualizerPreset.objects.get(pk=preset_id)
    except EqualizerPreset.DoesNotExist:
        return Response({"error": "Preset not found"}, status=status.HTTP_404_NOT_FOUND)

    cache.set(cache_key, preset_id, timeout=None)
    return Response({
        "success": True,
        "preset": {"id": preset.id, "name": preset.name, "description": preset.description},
    })


# ---------------------------------------------------------------------------
# Admin verification
# ---------------------------------------------------------------------------

class MusicVerificationViewSet(viewsets.ModelViewSet):
    """Admin-only CRUD + approve/reject for track verification."""

    serializer_class = MusicVerificationSerializer
    permission_classes = [IsAdminUser]
    pagination_class = MusicPagination

    def get_queryset(self):
        return (
            Music.objects.select_related("artist", "artist__user")
            .prefetch_related("genres")
            .order_by("-created_at")
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approve a track for public availability."""
        music = self.get_object()
        music.approval_status = MusicApprovalStatus.APPROVED
        music.save(update_fields=["approval_status", "updated_at"])
        serializer = self.get_serializer(music)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Reject a track."""
        music = self.get_object()
        music.approval_status = MusicApprovalStatus.REJECTED
        music.save(update_fields=["approval_status", "updated_at"])
        serializer = self.get_serializer(music)
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# Streaming
# ---------------------------------------------------------------------------

class MusicStreamingView(APIView):
    """Return the HLS streaming URL for a track at the user's preferred quality."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [MusicStreamingRateThrottle]

    def get(self, request, music_id: int) -> Response:
        music = get_object_or_404(Music, id=music_id)

        # Permission check
        if not music.is_public and music.artist.user != request.user:
            return Response(
                {"error": "You do not have permission to access this music."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Resolve quality via service
        preferred_quality = StreamingService.resolve_quality(request.user)
        streaming_url = StreamingService.get_streaming_url(music_id, preferred_quality)

        if not streaming_url:
            return Response(
                {"error": "No streaming files available for this music."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Determine actual quality served
        streaming_file = StreamingFile.objects.filter(
            music=music, hls_playlist=streaming_url
        ).first()
        quality_served = streaming_file.quality if streaming_file else preferred_quality

        # Use relative URLs for proxy compatibility in local development
        # HLS.js handled by Vite proxy for /media requests
        
        cover_photo_url = None
        if music.cover_photo:
            cover_photo_url = music.cover_photo.url

        return Response({
            "music_id": music_id,
            "quality_served": quality_served,
            "user_preferred_quality": preferred_quality,
            "url": streaming_url,
            "name": music.name,
            "artist": music.artist.user.username,
            "quality_matched": quality_served == preferred_quality,
            "cover_photo": cover_photo_url,
        })


# ---------------------------------------------------------------------------
# User quality preference
# ---------------------------------------------------------------------------

class UserQualityPreferenceView(APIView):
    """Get the user's current streaming quality setting."""

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        user = request.user
        pref, _ = UserPreference.objects.get_or_create(
            user=user, defaults={"preferred_quality": HLSQuality.LOW}
        )

        is_premium = _is_user_premium(user)

        # Force low quality for non-premium users
        if not is_premium and pref.preferred_quality != HLSQuality.LOW:
            pref.preferred_quality = HLSQuality.LOW
            pref.save(update_fields=["preferred_quality", "updated_at"])

        return Response({
            "current_quality": pref.preferred_quality,
            "is_premium": is_premium,
        })




class UpdateUserPreferenceView(UpdateAPIView):
    """Update the user's streaming quality preference (premium only for higher tiers)."""

    permission_classes = [IsAuthenticated]
    serializer_class = UserPreferenceSerializer

    def get_object(self):
        pref, _ = UserPreference.objects.get_or_create(
            user=self.request.user,
            defaults={"preferred_quality": HLSQuality.LOW},
        )
        return pref

    def update(self, request, *args, **kwargs):
        is_premium = _is_user_premium(request.user)
        requested_quality = request.data.get("preferred_quality")

        if not is_premium and requested_quality != HLSQuality.LOW:
            return Response(
                {"error": "Premium subscription required for higher quality options"},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)
