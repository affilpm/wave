from django.contrib import admin
from .models import Music, Genre, EqualizerPreset, StreamingFile, UserPreference
# Register your models here.
admin.site.register(Genre)
admin.site.register(Music)
admin.site.register(StreamingFile)
admin.site.register(UserPreference)
admin.site.register(EqualizerPreset)