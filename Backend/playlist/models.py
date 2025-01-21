from django.db import models

# Create your models here.
from django.db import models
from django.core.validators import FileExtensionValidator
from music.models import Music
from users.models import CustomUser

class Playlist(models.Model):
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_playlists')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=True, help_text="Whether this playlist is publicly available")
    cover_photo = models.ImageField(
        upload_to='playlist_covers/',
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png'])]
    )
    tracks = models.ManyToManyField(Music, through='PlaylistTrack', related_name='playlists')  # Changed to tracks
    duration = models.PositiveIntegerField(default=0, help_text="Total duration of the playlist in seconds")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    



    class Meta:
        ordering = ['-created_at']
        

    def __str__(self):
        return f"Playlist: {self.name} by {self.created_by.email}"

class PlaylistTrack(models.Model):
    playlist = models.ForeignKey(Playlist, on_delete=models.CASCADE)
    music = models.ForeignKey(Music, on_delete=models.CASCADE)  # Reference to the Music model
    track_number = models.PositiveIntegerField()

    class Meta:
        ordering = ['track_number']
        unique_together = ['playlist', 'music', 'track_number']

