from django.contrib import admin
from .models import LiveStream, StreamParticipant, ChatMessage
# Register your models here.

admin.site.register(LiveStream)
admin.site.register(StreamParticipant)
admin.site.register(ChatMessage)

