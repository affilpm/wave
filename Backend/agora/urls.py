from .views import AgoraTokenView, EndStreamView
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LiveStreamViewSet, ParticipantLeaveView, ParticipantHeartbeatView, ViewerCountView

router = DefaultRouter()
router.register(r'streams', LiveStreamViewSet)

urlpatterns = [
    
    path('', include(router.urls)),
    path('token/', AgoraTokenView.as_view(), name='agora-token'),
    path('end-stream/', EndStreamView.as_view(), name='end-stream'),
    # path('token/<str:channel_name>/<str:user_id>/', generate_agora_token),
    path('participant/heartbeat/', ParticipantHeartbeatView.as_view(), name='participant-heartbeat'),
    path('participant/leave/', ParticipantLeaveView.as_view(), name='participant-leave'),
    path('viewer-count/', ViewerCountView.as_view(), name='viewer_count'),
    
    
]