from django.contrib import admin
from .models import PlayHistory, PlayCount, PlaySession

# Register your models here.

admin.site.register(PlayHistory)
admin.site.register(PlayCount)
admin.site.register(PlaySession)

