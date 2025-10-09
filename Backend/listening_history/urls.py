from django.urls import path
from .views import log_activity


urlpatterns = [

    path('record-activity/<int:music_id>/', log_activity, name='record_activity'),
]
