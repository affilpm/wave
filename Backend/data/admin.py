from django.contrib import admin
from .models import UserMusicHistory

class UserMusicHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'music', 'play_count', 'last_played_at', 'total_listen_time')
    search_fields = ('user__username', 'music__name')
    list_filter = ('last_played_at',)
    ordering = ('-last_played_at',)
    readonly_fields = ('last_played_at',)

admin.site.register(UserMusicHistory, UserMusicHistoryAdmin)