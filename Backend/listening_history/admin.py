from django.contrib import admin
from .models import MusicActivity, MusicPlayCount, ArtistActivity, ArtistPlayCount, RecentlyPlayed
# Register your models here.

admin.site.register(MusicActivity)
admin.site.register(MusicPlayCount)
admin.site.register(ArtistActivity)
admin.site.register(ArtistPlayCount)
admin.site.register(RecentlyPlayed)


