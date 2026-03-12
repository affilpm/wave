"""
Django signals for the music app.

Handles:
- Auto-unpublish when a track is not approved
- HLS conversion trigger on new uploads
- HLS cleanup on deletion
- Subscription-based quality enforcement
- Default user preferences on user creation
"""

from __future__ import annotations

import logging

from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from music.models import HLSQuality, Music, MusicApprovalStatus, StreamingFile, UserPreference
from music.tasks import cleanup_failed_hls_conversion, convert_audio_to_hls
from premium.models import SubscriptionStatus, UserSubscription
from users.models import CustomUser

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Music lifecycle signals
# ---------------------------------------------------------------------------

@receiver(post_save, sender=Music)
def enforce_approval_visibility(sender, instance, **kwargs):
    """
    Ensure tracks that are not approved cannot be public.

    Uses ``update_fields`` to avoid triggering this signal recursively.
    """
    if instance.approval_status in (
        MusicApprovalStatus.PENDING,
        MusicApprovalStatus.REJECTED,
    ) and instance.is_public:
        Music.objects.filter(pk=instance.pk).update(is_public=False)


@receiver(post_save, sender=Music)
def auto_convert_to_hls(sender, instance, created, **kwargs):
    """
    Queue HLS conversion for new uploads or tracks without streaming files.

    Uses ``transaction.on_commit`` to avoid Celery processing before the
    DB commit completes.
    """
    def _queue():
        from .services import MusicService
        MusicService.handle_music_save(instance, created)

    transaction.on_commit(_queue)


@receiver(post_save, sender=Music)
def handle_approval_hls_check(sender, instance, created, **kwargs):
    """
    When a track is approved, ensure HLS files exist.

    If no ``StreamingFile`` records exist, queue a conversion.
    """
    if created:
        return

    if (
        instance.approval_status == MusicApprovalStatus.APPROVED
        and instance.audio_file
        and not StreamingFile.objects.filter(music=instance).exists()
    ):
        logger.info(
            "Approved track missing HLS files — triggering conversion music_id=%s",
            instance.id,
        )
        convert_audio_to_hls.delay(instance.id)


@receiver(post_delete, sender=Music)
def cleanup_hls_on_delete(sender, instance, **kwargs):
    """Queue cleanup of S3 HLS artefacts when a track is deleted."""
    logger.info("Music deleted id=%s — cleaning up HLS files", instance.id)
    cleanup_failed_hls_conversion.delay(instance.id)


@receiver(post_delete, sender=StreamingFile)
def log_streaming_file_deletion(sender, instance, **kwargs):
    """Log when an individual streaming file record is removed."""
    try:
        logger.info(
            "StreamingFile deleted music=%s quality=%s",
            instance.music.name, instance.quality,
        )
    except Exception:
        pass  # Music may have already been deleted


# ---------------------------------------------------------------------------
# Subscription & preference signals
# ---------------------------------------------------------------------------

@receiver(post_save, sender=UserSubscription)
def enforce_quality_on_subscription_change(sender, instance, created, **kwargs):
    """
    Revert streaming quality to LOW when a subscription expires or is cancelled.
    """
    if created:
        return
    if instance.status not in (SubscriptionStatus.EXPIRED, SubscriptionStatus.CANCELLED):
        return

    pref = UserPreference.objects.filter(user=instance.user).first()
    if pref and pref.preferred_quality != HLSQuality.LOW:
        pref.preferred_quality = HLSQuality.LOW
        pref.save(update_fields=["preferred_quality", "updated_at"])
        logger.info(
            "Reverted quality to LOW for user=%s (subscription %s)",
            instance.user.email, instance.status,
        )
    elif not pref:
        UserPreference.objects.create(user=instance.user, preferred_quality=HLSQuality.LOW)


@receiver(pre_save, sender=UserSubscription)
def auto_expire_subscription(sender, instance, **kwargs):
    """Mark subscriptions as expired if `expires_at` is in the past."""
    if (
        instance.expires_at
        and instance.expires_at <= timezone.now()
        and instance.status == SubscriptionStatus.ACTIVE
    ):
        instance.status = SubscriptionStatus.EXPIRED


@receiver(post_save, sender=CustomUser)
def create_default_user_preference(sender, instance, created, **kwargs):
    """Create a default LOW-quality streaming preference for new users."""
    if created:
        UserPreference.objects.create(
            user=instance, preferred_quality=HLSQuality.LOW
        )