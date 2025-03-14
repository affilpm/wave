from django.urls import path
from .views import AgoraTokenView, LiveStreamListView, EndStreamView

urlpatterns = [
    path('token/', AgoraTokenView.as_view(), name='agora-token'),
    path('streams/', LiveStreamListView.as_view(), name='stream-list'),
    path('end-stream/', EndStreamView.as_view(), name='end-stream'),
]
