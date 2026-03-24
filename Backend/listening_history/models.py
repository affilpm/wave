"""
Listening history and activity tracking models for the Wave platform.

Records user play activity, artist engagement, and aggregated play counts
for analytics and recommendation purposes.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.timezone import now


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class MusicActivityType(models.TextChoices):
    """Possible music activity events."""

    PLAY = "play", "Play"
    COMPLETE = "complete", "Complete"


# ---------------------------------------------------------------------------
# Aggregated stats
# ---------------------------------------------------------------------------

class MusicPlayCount(models.Model):
    """Aggregated play count for a single track."""

    music = models.OneToOneField(
        "music.Music",
        on_delete=models.CASCADE,
        related_name="play_stats",
    )
    total_plays = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "track play count"
        verbose_name_plural = "track play counts"

    def __str__(self) -> str:
        return f"{self.music.name} - {self.total_plays} plays"


class ArtistPlayCount(models.Model):
    """Aggregated play count across all tracks by an artist."""

    artist = models.OneToOneField(
        "artists.Artist",
        on_delete=models.CASCADE,
        related_name="play_stats",
    )
    total_plays = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "artist play count"
        verbose_name_plural = "artist play counts"

    def __str__(self) -> str:
        return f"{self.artist.user.email} - {self.total_plays} plays"


# ---------------------------------------------------------------------------
# Activity log
# ---------------------------------------------------------------------------

class MusicActivity(models.Model):
    """Raw log of user play / complete events for a track."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="music_activities",
    )
    music = models.ForeignKey(
        "music.Music",
        on_delete=models.CASCADE,
        related_name="activities",
    )
    activity_type = models.CharField(
        max_length=20,
        choices=MusicActivityType.choices,
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "music activity"
        verbose_name_plural = "music activities"
        ordering = ["-timestamp"]

    def __str__(self) -> str:
        return f"{self.user} - {self.music.name} ({self.activity_type})"


class RecentlyPlayed(models.Model):
    """Cache of users' most recently played tracks for quick lookup."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recently_played",
    )
    music = models.ForeignKey("music.Music", on_delete=models.CASCADE)
    last_played = models.DateTimeField(default=now)

    class Meta:
        verbose_name = "recently played"
        verbose_name_plural = "recently played"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "music"],
                name="unique_user_recently_played",
            )
        ]
        ordering = ["-last_played"]

    def __str__(self) -> str:
        return f"{self.user} recently played {self.music.name}"


class ListeningHistory(models.Model):
    """
    Detailed listening history with context tracking.
    Ensures one record per (user, track) with play count and context.
    """

    class SourceType(models.TextChoices):
        PLAYLIST = "playlist", "Playlist"
        ALBUM = "album", "Album"
        ARTIST = "artist", "Artist"
        SINGLE = "single", "Single"
        SEARCH = "search", "Search"
        RECOMMENDATION = "recommendation", "Recommendation"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listening_histories",
    )
    track = models.ForeignKey(
        "music.Music",
        on_delete=models.CASCADE,
        related_name="listening_histories",
    )
    album = models.ForeignKey(
        "music.Album",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="listening_histories",
    )
    artist = models.ForeignKey(
        "artists.Artist",
        on_delete=models.CASCADE,
        related_name="listening_histories",
    )
    
    source_type = models.CharField(
        max_length=20,
        choices=SourceType.choices,
        default=SourceType.SINGLE,
    )
    source_id = models.CharField(max_length=255, null=True, blank=True)
    
    last_played_at = models.DateTimeField(auto_now=True)
    play_count = models.PositiveIntegerField(default=1)

    class Meta:
        verbose_name = "listening history"
        verbose_name_plural = "listening histories"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "track"],
                name="unique_user_track_history",
            )
        ]
        ordering = ["-last_played_at"]

    def __str__(self) -> str:
        return f"{self.user} - {self.track.name} ({self.play_count} plays)"


class ArtistActivity(models.Model):
    """Tracks a user's cumulative engagement with a specific artist."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="artist_activities",
    )
    artist = models.ForeignKey(
        "artists.Artist",
        on_delete=models.CASCADE,
        related_name="user_activities",
    )
    total_plays = models.PositiveIntegerField(default=0)
    last_played = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "artist activity"
        verbose_name_plural = "artist activities"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "artist"],
                name="unique_user_artist_activity",
            )
        ]
        ordering = ["-last_played"]

    def __str__(self) -> str:
        return f"{self.user} listened to {self.artist.user.email} ({self.total_plays} plays)"