from django.contrib import admin
from .models import Music, Genre, MusicPlayHistory
# Register your models here.
admin.site.register(Genre)
admin.site.register(Music)
admin.site.register(MusicPlayHistory)


# from django.contrib import admin
# from .models import Album, AlbumTrack

# class AlbumTrackInline(admin.TabularInline):
#     model = AlbumTrack
#     extra = 1  # Number of empty forms to display by default

# class AlbumAdmin(admin.ModelAdmin):
#     list_display = ('name', 'artist', 'release_date', 'status', 'created_at', 'updated_at')
#     list_filter = ('status', 'release_date', 'artist')
#     search_fields = ('name', 'artist__user__email')
#     ordering = ['-created_at']
#     inlines = [AlbumTrackInline]  # To add tracks directly in the album form

# class AlbumTrackAdmin(admin.ModelAdmin):
#     list_display = ('album', 'track', 'track_number')
#     list_filter = ('album',)
#     search_fields = ('album__name', 'track__name')

#     def get_queryset(self, request):
#         """
#         Override the get_queryset method to filter the AlbumTrack objects 
#         based on the logged-in user's artist profile.
#         """
#         queryset = super().get_queryset(request)
#         if request.user.is_superuser:
#             return queryset  # Allow superusers to see all data
#         return queryset.filter(album__artist=request.user.artist_profile)

# admin.site.register(Album, AlbumAdmin)
# admin.site.register(AlbumTrack, AlbumTrackAdmin)