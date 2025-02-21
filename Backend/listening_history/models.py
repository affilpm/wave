from django.db import models
from users.models import CustomUser
from music.models import Music




class PlayHistory(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='play_history')
    music = models.ForeignKey(Music, on_delete=models.CASCADE, related_name='play_counts')
    played_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'played_at']),
            models.Index(fields=['music', 'played_at'])
        ]
        
    def __str__(self):
        return f"{self.user.email} played {self.music.name} at {self.played_at}"
    
    
    
class PlayCount(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)        
    music = models.ForeignKey(Music, on_delete=models.CASCADE)
    count = models.PositiveIntegerField(default=1)
    last_played = models.DateTimeField(auto_now=True)
    
    class meta:
        unique_together = ('user', 'music')
        indexes = [
            models.Index(fields=['user', 'last_played']),
            models.Index(fields=['music', 'count'])
            
        ]
        
    def __str__(self):
        return f'{self.user.email} played {self.music.name} {self.count} times'