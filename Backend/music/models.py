from django.db import models
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError
import os
from django.db import models
from django.core.validators import FileExtensionValidator

class Genre(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    
    def __str__(self):
        return self.name

class MusicApprovalStatus(models.TextChoices):
    PENDING = 'pending', 'Pending Review'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'

class Music(models.Model):
    artist = models.ForeignKey('artists.artist', on_delete=models.CASCADE, related_name='musical_works')
    name = models.CharField(max_length=200)
    cover_photo = models.ImageField(upload_to='music_covers/')
    audio_file = models.FileField(
        upload_to='music/',
        validators=[FileExtensionValidator(allowed_extensions=['mp3', 'wav', 'aac'])]
    )
    video_file = models.FileField(
        upload_to='music_videos/',
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['mp4', 'mov'])]
    )
    genres = models.ManyToManyField(Genre, related_name='musical_works')
    duration = models.DurationField(null=True, blank=True)
    approval_status = models.CharField(
        max_length=20,
        choices=MusicApprovalStatus.choices,
        default=MusicApprovalStatus.PENDING
    )
    release_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_public = models.BooleanField(default=True, help_text="Whether this music is publicly available")

    def __str__(self):
        return f"{self.name} by {self.artist.user.email}"
    
    def clean(self):
        super().clean()
        if not self.audio_file and not self.video_file:
            raise ValidationError("At least one of audio_file or video_file must be provided.")

    def save(self, *args, **kwargs):
        if self.cover_photo:
            # Truncate filename if it exceeds 100 characters
            file_name, file_extension = os.path.splitext(self.cover_photo.name)
            if len(file_name) > 100:
                self.cover_photo.name = file_name[:100] + file_extension
        super().save(*args, **kwargs)
        
        
        


class AlbumStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PUBLISHED = 'published', 'Published'
    SCHEDULED = 'scheduled', 'Scheduled'

class Album(models.Model):
    artist = models.ForeignKey('artists.artist', on_delete=models.CASCADE, related_name='albums')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=True, help_text="Whether this album is publicly available")
    cover_photo = models.ImageField(
        upload_to='album_covers/',
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png'])]
    )
    banner_img = models.ImageField(
        upload_to='album_banners/',
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png'])],
        null=True,
        blank=True
    )
    tracks = models.ManyToManyField(Music, related_name='albums', through='AlbumTrack')
    release_date = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=AlbumStatus.choices,
        default=AlbumStatus.PUBLISHED
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} by {self.artist.user.email}"

class AlbumTrack(models.Model):
    album = models.ForeignKey(Album, on_delete=models.CASCADE)
    track = models.ForeignKey(Music, on_delete=models.CASCADE)
    track_number = models.PositiveIntegerField()
    
    class Meta:
        ordering = ['track_number']
        unique_together = ['album', 'track_number']        