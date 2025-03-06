from django.db import models
from artists.models import Artist


# Create your models here.
class Livestream(models.Model):
    STATUS_CHOICES = [
        ('preparing', 'Preparing'),
        ('live', 'Live'),
        ('ended', 'Ended')
    ]

    artist = models.ForeignKey(Artist, on_delete=models.CASCADE, related_name='livestreams')  # Corrected reference
    stream_key = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='preparing')
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    total_viewers = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.artist.user.username}'s Livestream - {self.status}"