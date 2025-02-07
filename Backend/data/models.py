from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from music.models import Music
from users.models import CustomUser
User = get_user_model()

class UserMusicHistory(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='music_history')
    music = models.ForeignKey(Music, on_delete=models.CASCADE, related_name='user_plays')
    
    play_count = models.PositiveIntegerField(default=1)
    last_played_at = models.DateTimeField(auto_now=True)
    total_listen_time = models.DurationField(default=timezone.timedelta())
    
    # New fields
    start_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'music')
        ordering = ['-last_played_at']

    @classmethod
    def log_play(cls, user, music, duration=None):
        history, created = cls.objects.get_or_create(
            user=user,
            music=music,
            defaults={
                'play_count': 1,
                'total_listen_time': duration or timezone.timedelta(),
                'start_time': timezone.now(),
                'is_active': True
            }
        )
        
        if not created:
            history.play_count += 1
            if duration:
                history.total_listen_time += duration
            history.save()
        
        return history

    def __str__(self):
        return f"{self.user.username} - {self.music.name}"