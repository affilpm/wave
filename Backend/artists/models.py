from django.db import models
from users.models import CustomUser
from music.models import Genre

class ArtistVerificationStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'

class Artist(models.Model):
    user = models.OneToOneField('users.CustomUser', on_delete=models.CASCADE, related_name='artist_profile')
    bio = models.TextField(max_length=1000, blank=True)
    photo = models.ImageField(upload_to='artist_photo/', null=True, blank=True)
    banner_photo = models.ImageField(upload_to='banner_photo/', null=True, blank=True)
    genres = models.ManyToManyField(Genre, related_name='artists')
    status = models.CharField(
        max_length=20,
        choices=ArtistVerificationStatus.choices,
        default=ArtistVerificationStatus.PENDING
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @property
    def has_active_stream(self):
        """Check if artist has an active stream"""
        return self.hosted_streams.filter(status='active').exists()
    
    def __str__(self):
        genres = ", ".join(genre.name for genre in self.genres.all())
        return f"Artist: {self.user.email} - {self.status} - Genres: {genres or 'None'}"
    
    
from django.utils import timezone   
    
class Follow(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='following_artist')
    artist = models.ForeignKey(Artist, on_delete=models.CASCADE, related_name='followers')    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        unique_together = ('user', 'artist')
        
    def __str__(self):
        return f'{self.user.email} follows {self.artist.user.email}'    