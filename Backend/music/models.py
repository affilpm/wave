from django.db import models
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError
import os
import uuid
from django.db import models
from django.core.validators import FileExtensionValidator
from users.models import CustomUser        


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
    name = models.CharField(max_length=200, unique=True)
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
    is_public = models.BooleanField(default=False, help_text="Whether this music is publicly available")
    
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
                
            if hasattr(self, 'duration') and self.duration is not None:
                print("Saving duration:", self.duration)  # Debug print
    
        super().save(*args, **kwargs)


class HLSQuality(models.TextChoices):
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'
    LOSSLESS = 'lossless', 'Lossless'

class StreamingFile(models.Model):
    music = models.ForeignKey('Music', on_delete=models.CASCADE, related_name='streaming_files')
    quality = models.CharField(max_length=20, choices=HLSQuality.choices)
    hls_playlist = models.URLField(help_text="URL to the .m3u8 file")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('music', 'quality')

    def __str__(self):
        return f"{self.music.name} - {self.quality}"        
        

class UserPreference(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='preference')
    preferred_quality = models.CharField(
        max_length=20,
        choices=HLSQuality.choices,
        default=HLSQuality.LOW,
        help_text="User's preferred streaming quality"
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - {self.preferred_quality}"



class AlbumStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    PUBLISHED = 'published', 'Published'
    SCHEDULED = 'scheduled', 'Scheduled'

class Album(models.Model):
    artist = models.ForeignKey('artists.artist', on_delete=models.CASCADE, related_name='albums')
    name = models.CharField(max_length=200, unique=True)
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
    duration = models.PositiveIntegerField(default=0, help_text="Total duration of the album in seconds")
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
        


class EqualizerPreset(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255, blank=True)
    
    # FFmpeg equalizer filter parameters
    # The values represent gain in dB for each frequency band
    # Typically: 31Hz, 62Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz
    band_31 = models.FloatField(default=0.0)
    band_62 = models.FloatField(default=0.0)
    band_125 = models.FloatField(default=0.0)
    band_250 = models.FloatField(default=0.0)
    band_500 = models.FloatField(default=0.0)
    band_1k = models.FloatField(default=0.0)
    band_2k = models.FloatField(default=0.0)
    band_4k = models.FloatField(default=0.0)
    band_8k = models.FloatField(default=0.0)
    band_16k = models.FloatField(default=0.0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    def get_eq_filter_params(self):
        """Returns FFmpeg equalizer filter parameters as a string"""
        return f"equalizer=f=31:width_type=o:width=1:g={self.band_31}," \
               f"equalizer=f=62:width_type=o:width=1:g={self.band_62}," \
               f"equalizer=f=125:width_type=o:width=1:g={self.band_125}," \
               f"equalizer=f=250:width_type=o:width=1:g={self.band_250}," \
               f"equalizer=f=500:width_type=o:width=1:g={self.band_500}," \
               f"equalizer=f=1000:width_type=o:width=1:g={self.band_1k}," \
               f"equalizer=f=2000:width_type=o:width=1:g={self.band_2k}," \
               f"equalizer=f=4000:width_type=o:width=1:g={self.band_4k}," \
               f"equalizer=f=8000:width_type=o:width=1:g={self.band_8k}," \
               f"equalizer=f=16000:width_type=o:width=1:g={self.band_16k}"

