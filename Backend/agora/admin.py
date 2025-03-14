from django.contrib import admin
from .models import LiveStream, StreamParticipant
# Register your models here.

admin.site.register(LiveStream)
admin.site.register(StreamParticipant)
