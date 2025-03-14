from .views import AgoraTokenView, LiveStreamListView, EndStreamView, current_user, LiveStreamInfoView, JoinStreamView
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LiveStreamViewSet

router = DefaultRouter()
router.register(r'streams', LiveStreamViewSet)

urlpatterns = [
    
    path('', include(router.urls)),
    # path('<str:channel_name>/', LiveStreamInfoView.as_view(), name='livestream-info'),
    # path('<int:stream_id>/stats/', StreamStatisticsView.as_view(), name='stream-statistics'),
    path('token/', AgoraTokenView.as_view(), name='agora-token'),
    path('join-stream/', JoinStreamView.as_view(), name='join-stream'),
    # path('streams/', LiveStreamListView.as_view(), name='stream-list'),
    path('end-stream/', EndStreamView.as_view(), name='end-stream'),
    path('current/', current_user, name='current-user'),
]