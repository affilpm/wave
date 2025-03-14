from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings

class LiveStream(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('ended', 'Ended'),
        ('scheduled', 'Scheduled'),
    )
    
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='hosted_streams')
    channel_name = models.CharField(max_length=255, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    thumbnail = models.ImageField(upload_to='stream_thumbnails/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    scheduled_start_time = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} by {self.host.username}"
    
    @property
    def participant_count(self):
        return self.participants.count()


class StreamParticipant(models.Model):
    stream = models.ForeignKey(LiveStream, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='joined_streams')
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('stream', 'user')
    
    def __str__(self):
        return f"{self.user.username} in {self.stream.title}"