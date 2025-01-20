from django.contrib import admin
from .models import Playlist, PlaylistTrack
# Register your models here.
admin.site.register(PlaylistTrack),
admin.site.register(Playlist)
