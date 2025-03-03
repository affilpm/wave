from django.db import models
from users.models import CustomUser
from music.models import Music




class PlayHistory(models.Model):
    PLAY_STATUS_CHOICES = [
        ('initiated', 'Playback Initiated'),
        ('completed', 'Playback Completed'),
        ('aborted', 'Playback Aborted'),
    ]
    
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='play_history')
    music = models.ForeignKey(Music, on_delete=models.CASCADE, related_name='play_counts')
    played_at = models.DateTimeField(auto_now_add=True)
    played_duration = models.FloatField(null=True, blank=True, help_text="Duration in seconds the track was played")
    counted_as_play = models.BooleanField(default=True, help_text="Whether this play met criteria to count as a legitimate play")
    play_status = models.CharField(max_length=20, choices=PLAY_STATUS_CHOICES, default='initiated')
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'played_at']),
            models.Index(fields=['music', 'played_at']),
            models.Index(fields=['counted_as_play']),
        ]
        
    def __str__(self):
        status = "counted" if self.counted_as_play else "not counted"

        return f"{self.user.email} played {self.music.name} at {self.played_at} ({status})"
    
    
    
class PlayCount(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)        
    music = models.ForeignKey(Music, on_delete=models.CASCADE)
    count = models.PositiveIntegerField(default=1)
    last_played = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'music')
        indexes = [
            models.Index(fields=['user', 'last_played']),
            models.Index(fields=['music', 'count'])
            
        ]
        
    def __str__(self):
        return f'{self.user.email} played {self.music.name} {self.count} times'