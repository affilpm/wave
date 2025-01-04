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
    
    def __str__(self):
        genres = ", ".join(genre.name for genre in self.genres.all())
        return f"Artist: {self.user.email} - {self.status} - Genres: {genres or 'None'}"