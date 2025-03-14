from django.db import models
from django.utils import timezone
from users.models import CustomUser

class LiveStream(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('ended', 'Ended'),
        ('scheduled', 'Scheduled'),
    ]
    
    host = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='hosted_streams')
    channel_name = models.CharField(max_length=255, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    thumbnail = models.ImageField(upload_to='stream_thumbnails/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    scheduled_start_time = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} by {self.host.username} ({self.status})"
    
    @property
    def duration(self):
        if self.status == 'active':
            return timezone.now() - self.created_at
        elif self.ended_at:
            return self.ended_at - self.created_at
        return None
    
    @property
    def participant_count(self):
        return self.participants.count()
    
    def end_stream(self):
        if self.status == 'active':
            self.status = 'ended'
            self.ended_at = timezone.now()
            self.save()


class StreamParticipant(models.Model):
    stream = models.ForeignKey(LiveStream, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='stream_participations')
    joined_at = models.DateTimeField(default=timezone.now)
    left_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('stream', 'user')
    
    def __str__(self):
        return f"{self.user.username} in {self.stream.channel_name}"
    
    def leave(self):
        if not self.left_at:
            self.left_at = timezone.now()
            self.save()