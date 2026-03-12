"""
Artist service layer — verification, follow/unfollow, and stats logic.
"""

from __future__ import annotations

import logging

from django.db.models import Count, QuerySet

from artists.models import Artist, ArtistVerificationStatus, Follow
from users.models import CustomUser

logger = logging.getLogger(__name__)


class ArtistService:
    """Business logic for artist profiles, verification, and following."""

    @staticmethod
    def get_approved_artists() -> QuerySet[Artist]:
        """Return all approved artists with user info pre-loaded."""
        return (
            Artist.objects.filter(status=ArtistVerificationStatus.APPROVED)
            .select_related("user")
            .prefetch_related("genres")
        )

    @staticmethod
    def get_artist_by_id(artist_id: int) -> Artist | None:
        """Fetch a single artist with related data."""
        try:
            return (
                Artist.objects
                .select_related("user")
                .prefetch_related("genres")
                .annotate(follower_count=Count("followers"))
                .get(pk=artist_id)
            )
        except Artist.DoesNotExist:
            return None

    @staticmethod
    def update_verification_status(
        artist_id: int, new_status: str
    ) -> tuple[bool, str]:
        """
        Update an artist's verification status.

        Returns:
            (success, message) tuple.
        """
        if new_status not in ArtistVerificationStatus.values:
            return False, "Invalid status"

        try:
            artist = Artist.objects.get(pk=artist_id)
        except Artist.DoesNotExist:
            return False, "Artist not found"

        artist.status = new_status
        artist.save(update_fields=["status", "updated_at"])
        logger.info(
            "Artist %s status updated to %s", artist_id, new_status
        )
        return True, artist.status

    @staticmethod
    def toggle_follow(user: CustomUser, artist_id: int) -> tuple[bool, str]:
        """
        Toggle follow/unfollow for a user on an artist.

        Returns:
            (is_following, message) tuple.
        """
        try:
            artist = Artist.objects.get(pk=artist_id)
        except Artist.DoesNotExist:
            return False, "Artist not found"

        follow, created = Follow.objects.get_or_create(user=user, artist=artist)
        if not created:
            follow.delete()
            return False, "Unfollowed successfully"
        return True, "Followed successfully"

    @staticmethod
    def is_following(user: CustomUser, artist_id: int) -> bool:
        """Check whether the user follows the given artist."""
        return Follow.objects.filter(user=user, artist_id=artist_id).exists()

    @staticmethod
    def get_follower_count(artist_id: int) -> int:
        """Return the number of followers for an artist."""
        return Follow.objects.filter(artist_id=artist_id).count()

    @staticmethod
    def get_top_artists(limit: int = 5) -> QuerySet:
        """Return artists ordered by follower count (descending)."""
        return (
            Artist.objects
            .annotate(follower_count=Count("followers"))
            .select_related("user")
            .order_by("-follower_count")[:limit]
        )
