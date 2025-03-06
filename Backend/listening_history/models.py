from django.db import models
from users.models import CustomUser
from music.models import Music



    
class PlaySession(models.Model):
    """
    Model to track unique play sessions and prevent duplicate counting
    """
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    music = models.ForeignKey(Music, on_delete=models.CASCADE)
    play_id = models.CharField(max_length=100, unique=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('initiated', 'Initiated'),
            ('completed', 'Completed'),
            ('abandoned', 'Abandoned')
        ],
        default='initiated'
    )
    duration = models.FloatField(null=True, blank=True)
    counted_as_play = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ('user', 'play_id')
        indexes = [
            models.Index(fields=['play_id']),
            models.Index(fields=['user', 'music']),
        ]

    
