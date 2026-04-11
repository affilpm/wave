"""
Core music models for the Wave platform.

Contains the primary ``Music`` track model, streaming-quality models,
album models, equalizer presets, and related enumerations.
"""

from __future__ import annotations

import logging
import os

from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db import models

from users.models import CustomUser

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class MusicApprovalStatus(models.TextChoices):
    """Workflow states for track approval by admin."""

    PENDING = "pending", "Pending Review"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class HLSQuality(models.TextChoices):
    """Available HLS streaming quality tiers."""

    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    LOSSLESS = "lossless", "Lossless"


class AlbumStatus(models.TextChoices):
    """Publication states for albums."""

    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"
    SCHEDULED = "scheduled", "Scheduled"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Genre(models.Model):
    """Music genre used for categorisation and recommendations."""

    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "genre"
        verbose_name_plural = "genres"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Music(models.Model):
    """
    A single music track uploaded by an artist.

    Tracks go through an approval workflow before becoming publicly
    available.  Once approved, HLS streaming files are generated
    asynchronously via Celery.
    """

    artist = models.ForeignKey(
        "artists.Artist",
        on_delete=models.CASCADE,
        related_name="musical_works",
    )
    name = models.CharField(max_length=200, unique=True)
    cover_photo = models.ImageField(upload_to="music_covers/")
    audio_file = models.FileField(
        upload_to="music/",
        validators=[FileExtensionValidator(allowed_extensions=["mp3", "wav", "aac"])],
    )
    video_file = models.FileField(
        upload_to="music_videos/",
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=["mp4", "mov"])],
    )
    genres = models.ManyToManyField(Genre, related_name="musical_works")
    duration = models.DurationField(null=True, blank=True)
    approval_status = models.CharField(
        max_length=20,
        choices=MusicApprovalStatus.choices,
        default=MusicApprovalStatus.PENDING,
    )
    release_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_public = models.BooleanField(
        default=False,
        help_text="Whether this music is publicly available.",
    )

    class Meta:
        verbose_name = "track"
        verbose_name_plural = "tracks"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} by {self.artist.user.email}"

    def clean(self) -> None:
        """Ensure at least one media file is provided."""
        super().clean()
        if not self.audio_file and not self.video_file:
            raise ValidationError(
                "At least one of audio_file or video_file must be provided."
            )

    def save(self, *args: object, **kwargs: object) -> None:
        """Truncate excessively long cover-photo filenames before saving."""
        if self.cover_photo:
            file_name, file_extension = os.path.splitext(self.cover_photo.name)
            max_name_length = 100
            if len(file_name) > max_name_length:
                self.cover_photo.name = file_name[:max_name_length] + file_extension

        super().save(*args, **kwargs)


class StreamingFile(models.Model):
    """HLS streaming file for a specific quality tier of a track."""

    music = models.ForeignKey(
        Music,
        on_delete=models.CASCADE,
        related_name="streaming_files",
    )
    quality = models.CharField(max_length=20, choices=HLSQuality.choices)
    hls_playlist = models.URLField(help_text="URL to the .m3u8 file")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "streaming file"
        verbose_name_plural = "streaming files"
        constraints = [
            models.UniqueConstraint(
                fields=["music", "quality"],
                name="unique_music_quality",
            )
        ]

    def __str__(self) -> str:
        return f"{self.music.name} - {self.quality}"


class UserPreference(models.Model):
    """Stores user's preferred streaming quality setting."""

    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="preference",
    )
    preferred_quality = models.CharField(
        max_length=20,
        choices=HLSQuality.choices,
        default=HLSQuality.LOW,
        help_text="User's preferred streaming quality.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "user preference"
        verbose_name_plural = "user preferences"

    def __str__(self) -> str:
        return f"{self.user.email} - {self.preferred_quality}"


class Album(models.Model):
    """
    An album is a collection of tracks released together by an artist.

    Albums can be in DRAFT, PUBLISHED, or SCHEDULED states.
    """

    artist = models.ForeignKey(
        "artists.Artist",
        on_delete=models.CASCADE,
        related_name="albums",
    )
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(
        default=True,
        help_text="Whether this album is publicly available.",
    )
    cover_photo = models.ImageField(
        upload_to="album_covers/",
        validators=[FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png"])],
    )
    banner_img = models.ImageField(
        upload_to="album_banners/",
        validators=[FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png"])],
        null=True,
        blank=True,
    )
    tracks = models.ManyToManyField(
        Music,
        related_name="albums",
        through="AlbumTrack",
    )
    release_date = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=AlbumStatus.choices,
        default=AlbumStatus.PUBLISHED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    duration = models.PositiveIntegerField(
        default=0,
        help_text="Total duration of the album in seconds.",
    )

    class Meta:
        verbose_name = "album"
        verbose_name_plural = "albums"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} by {self.artist.user.email}"


class AlbumTrack(models.Model):
    """Through model linking a track to an album at a specific position."""

    album = models.ForeignKey(Album, on_delete=models.CASCADE)
    track = models.ForeignKey(Music, on_delete=models.CASCADE)
    track_number = models.PositiveIntegerField()

    class Meta:
        verbose_name = "album track"
        verbose_name_plural = "album tracks"
        ordering = ["track_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["album", "track_number"],
                name="unique_album_track_number",
            )
        ]

    def __str__(self) -> str:
        return f"{self.album.name} #{self.track_number}: {self.track.name}"


class EqualizerPreset(models.Model):
    """
    Predefined equalizer settings used by the frontend player.

    Each band represents gain in dB for a standard 10-band EQ
    (31 Hz → 16 kHz).
    """

    name = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255, blank=True)

    # FFmpeg equalizer filter parameters — gain (dB) per frequency band
    band_31 = models.FloatField(default=0.0, help_text="31 Hz")
    band_62 = models.FloatField(default=0.0, help_text="62 Hz")
    band_125 = models.FloatField(default=0.0, help_text="125 Hz")
    band_250 = models.FloatField(default=0.0, help_text="250 Hz")
    band_500 = models.FloatField(default=0.0, help_text="500 Hz")
    band_1k = models.FloatField(default=0.0, help_text="1 kHz")
    band_2k = models.FloatField(default=0.0, help_text="2 kHz")
    band_4k = models.FloatField(default=0.0, help_text="4 kHz")
    band_8k = models.FloatField(default=0.0, help_text="8 kHz")
    band_16k = models.FloatField(default=0.0, help_text="16 kHz")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "equalizer preset"
        verbose_name_plural = "equalizer presets"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    def get_eq_filter_params(self) -> str:
        """Return FFmpeg equalizer filter parameters as a concatenated string."""
        bands: list[tuple[int, float]] = [
            (31, self.band_31),
            (62, self.band_62),
            (125, self.band_125),
            (250, self.band_250),
            (500, self.band_500),
            (1000, self.band_1k),
            (2000, self.band_2k),
            (4000, self.band_4k),
            (8000, self.band_8k),
            (16000, self.band_16k),
        ]
        return ",".join(
            f"equalizer=f={freq}:width_type=o:width=1:g={gain}"
            for freq, gain in bands
        )
