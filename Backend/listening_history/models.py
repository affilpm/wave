from django.db import models
from users.models import CustomUser
from music.models import Music
from django.conf import settings
from django.utils.timezone import now

    
# ---------------------------
# 1. Activity Types
# ---------------------------
class MusicActivityType(models.TextChoices):
    PLAY = "play", "Play"
    COMPLETE = "complete", "Complete"



# ---------------------------
# 2. Music-Level Stats
# ---------------------------
class MusicPlayCount(models.Model):
    """Aggregated play count for each track"""
    music = models.OneToOneField(
        "music.Music", on_delete=models.CASCADE, related_name="play_stats"
    )
    total_plays = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.music.name} - {self.total_plays} plays"


# ---------------------------
# 3. Artist-Level Stats
# ---------------------------
class ArtistPlayCount(models.Model):
    """Aggregated play count for each artist"""
    artist = models.OneToOneField(
        "artists.Artist", on_delete=models.CASCADE, related_name="play_stats"
    )
    total_plays = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.artist.user.email} - {self.total_plays} plays"


# ---------------------------
# 4. Full User Activity Log
# ---------------------------
class MusicActivity(models.Model):
    """Raw log of all user activities with music"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="music_activities",
    )
    music = models.ForeignKey(
        'music.Music', on_delete=models.CASCADE, related_name="activities"
    )
    activity_type = models.CharField(max_length=20, choices=MusicActivityType.choices)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.user} - {self.music.name} ({self.activity_type})"


# ---------------------------
# 5. Recently Played (Cache)
# ---------------------------
class RecentlyPlayed(models.Model):
    """Quick lookup for user’s last played tracks"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recently_played",
    )
    music = models.ForeignKey("music.Music", on_delete=models.CASCADE)
    last_played = models.DateTimeField(default=now)

    class Meta:
        unique_together = ("user", "music")
        ordering = ["-last_played"]

    def __str__(self):
        return f"{self.user} recently played {self.music.name}"


# ---------------------------
# 6. User–Artist Activity
# ---------------------------
class ArtistActivity(models.Model):
    """Tracks user’s engagement with specific artists"""
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
        unique_together = ("user", "artist")
        ordering = ["-last_played"]

    def __str__(self):
        return f"{self.user} listened to {self.artist.user.email} ({self.total_plays} plays)"