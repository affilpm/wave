"""
Artist models for the Wave platform.

Defines the ``Artist`` profile linked to a ``CustomUser``, verification
workflow, and the follow/unfollow relationship.
"""

from __future__ import annotations

from django.db import models
from django.utils import timezone

from music.models import Genre
from users.models import CustomUser


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class ArtistVerificationStatus(models.TextChoices):
    """Verification states for artist applications."""

    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Artist(models.Model):
    """
    Artist profile linked one-to-one with a ``CustomUser``.

    Artists must be verified (status=APPROVED) before their tracks
    become publicly available.
    """

    user = models.OneToOneField(
        "users.CustomUser",
        on_delete=models.CASCADE,
        related_name="artist_profile",
    )
    bio = models.TextField(max_length=1000, blank=True)
    genres = models.ManyToManyField(Genre, related_name="artists")
    status = models.CharField(
        max_length=20,
        choices=ArtistVerificationStatus.choices,
        default=ArtistVerificationStatus.PENDING,
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "artist"
        verbose_name_plural = "artists"
        ordering = ["-submitted_at"]

    def __str__(self) -> str:
        # Avoid N+1: do NOT call self.genres.all() here.
        return f"Artist: {self.user.email} ({self.status})"

    @property
    def is_approved(self) -> bool:
        """Return ``True`` if this artist's application has been approved."""
        return self.status == ArtistVerificationStatus.APPROVED

    @property
    def has_active_stream(self) -> bool:
        """Return ``True`` if this artist currently has an active livestream."""
        return self.hosted_streams.filter(status="active").exists()


class Follow(models.Model):
    """Records that a user follows a particular artist."""

    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="following_artist",
    )
    artist = models.ForeignKey(
        Artist,
        on_delete=models.CASCADE,
        related_name="followers",
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "follow"
        verbose_name_plural = "follows"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "artist"],
                name="unique_user_artist_follow",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user.email} follows {self.artist.user.email}"