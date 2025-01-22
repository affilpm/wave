from django.db import models


class Library(models.Model):
    user = models.OneToOneField(
        'users.CustomUser', on_delete=models.CASCADE, related_name='library'
    )
    albums = models.ManyToManyField('music.Album', blank=True, related_name='user_libraries')
    playlists = models.ManyToManyField('playlist.Playlist', blank=True, related_name='user_libraries')

    def __str__(self):
        return f"{self.user.email}'s Library"