"""
Music service layer — streaming, quality, and track management logic.

Centralises business rules that were previously scattered across views.
"""

from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.db import transaction
from django.db.models import QuerySet

from music.models import (
    HLSQuality,
    Music,
    MusicApprovalStatus,
    StreamingFile,
    UserPreference,
)
from users.models import CustomUser

logger = logging.getLogger(__name__)


class MusicService:
    """Business logic for track management and querying."""

    @staticmethod
    def get_approved_tracks() -> QuerySet[Music]:
        """Return all publicly available, approved tracks."""
        return (
            Music.objects.filter(
                approval_status=MusicApprovalStatus.APPROVED,
                is_public=True,
            )
            .select_related("artist", "artist__user")
            .prefetch_related("genres", "streaming_files")
        )

    @staticmethod
    def get_track_by_id(track_id: int) -> Music | None:
        """Fetch a single track with related data pre-loaded."""
        try:
            return (
                Music.objects
                .select_related("artist", "artist__user")
                .prefetch_related("genres", "streaming_files")
                .get(pk=track_id)
            )
        except Music.DoesNotExist:
            return None

    @staticmethod
    def trigger_hls_conversion(music_id: int) -> None:
        """
        Dispatch HLS conversion task for a specific track.
        
        Centralized here to ensure consistent task configuration (queue, countdown, etc.)
        regardless of whether triggered by a signal, admin action, or API.
        """
        from music.tasks import convert_audio_to_hls
        logger.info("Triggering HLS conversion via MusicService music_id=%s", music_id)
        # Using delay() or apply_async() without explicit queue to use default worker
        convert_audio_to_hls.apply_async(args=[music_id], countdown=5)

    @staticmethod
    def handle_music_save(instance: Music, created: bool) -> None:
        """
        Handles post-save logic for Music instances, specifically HLS conversion.

        This method is designed to be called from a signal handler.
        """
        def _queue_hls_conversion():
            if not instance.audio_file:
                return

            # Only trigger HLS conversion for approved tracks
            if instance.approval_status != MusicApprovalStatus.APPROVED:
                return

            # Trigger conversion if it's a new track or if no streaming files exist yet
            should_convert = created or not StreamingFile.objects.filter(music=instance).exists()

            if should_convert:
                MusicService.trigger_hls_conversion(instance.id)

        # Ensure task is queued only after the transaction is successfully committed
        transaction.on_commit(_queue_hls_conversion)


class StreamingService:
    """Business logic for HLS streaming quality resolution."""

    # Map quality tiers to FFmpeg bitrate settings
    QUALITY_BITRATES: dict[str, dict[str, str]] = {
        HLSQuality.LOW: {"audio_bitrate": "64k", "sample_rate": "22050"},
        HLSQuality.MEDIUM: {"audio_bitrate": "128k", "sample_rate": "44100"},
        HLSQuality.HIGH: {"audio_bitrate": "256k", "sample_rate": "48000"},
        HLSQuality.LOSSLESS: {"audio_bitrate": "320k", "sample_rate": "48000"},
    }

    @staticmethod
    def resolve_quality(user: CustomUser, requested_quality: str | None = None) -> str:
        """
        Determine the streaming quality for a user.

        Priority:
        1. Explicit ``requested_quality`` parameter
        2. User's stored preference
        3. Default to LOW
        """
        if requested_quality and requested_quality in HLSQuality.values:
            return requested_quality

        try:
            pref = UserPreference.objects.get(user=user)
            return pref.preferred_quality
        except UserPreference.DoesNotExist:
            return HLSQuality.LOW

    @staticmethod
    def get_streaming_url(music_id: int, quality: str) -> str | None:
        """
        Return the HLS playlist URL for a track at the given quality.

        Falls back to the next-lower quality if the requested one doesn't exist.
        """
        fallback_order = [
            HLSQuality.LOSSLESS,
            HLSQuality.HIGH,
            HLSQuality.MEDIUM,
            HLSQuality.LOW,
        ]

        # Try exact match first
        streaming_file = StreamingFile.objects.filter(
            music_id=music_id, quality=quality
        ).first()
        if streaming_file:
            return streaming_file.hls_playlist

        # Fallback: find the best available quality at or below requested
        try:
            requested_idx = fallback_order.index(quality)
        except ValueError:
            requested_idx = len(fallback_order) - 1

        for q in fallback_order[requested_idx:]:
            streaming_file = StreamingFile.objects.filter(
                music_id=music_id, quality=q
            ).first()
            if streaming_file:
                logger.info(
                    "Quality fallback: %s → %s for music_id=%s",
                    quality, q, music_id,
                )
                return streaming_file.hls_playlist

        return None

    @staticmethod
    def update_user_preference(user: CustomUser, quality: str) -> UserPreference:
        """Create or update the user's streaming quality preference."""
        pref, _ = UserPreference.objects.update_or_create(
            user=user,
            defaults={"preferred_quality": quality},
        )
        return pref
