from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, F

from .models import UserMusicHistory, Music
from .serializers import UserMusicHistorySerializer, MusicSerializer

class MusicViewSet(viewsets.ModelViewSet):
    queryset = Music.objects.filter(is_public=True)
    serializer_class = MusicSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['GET'])
    def user_stats(self, request):
        # User music listening statistics
        total_plays = UserMusicHistory.objects.filter(user=request.user).aggregate(
            total_plays=Sum('play_count'),
            total_listen_time=Sum('total_listen_time')
        )

        # Top played music
        top_music = UserMusicHistory.objects.filter(user=request.user).annotate(
            artist_name=F('music__artist__user__email'),
            music_name=F('music__name')
        ).order_by('-play_count')[:10]

        return Response({
            'total_plays': total_plays['total_plays'] or 0,
            'total_listen_time': str(total_plays['total_listen_time']),
            'top_played_music': UserMusicHistorySerializer(top_music, many=True).data
        })

    @action(detail=True, methods=['POST'])
    def log_play(self, request, pk=None):
        music = self.get_object()
        duration = request.data.get('duration')

        try:
            history = UserMusicHistory.log_play(
                user=request.user, 
                music=music, 
                duration=duration
            )
            
            return Response({
                'play_count': history.play_count,
                'total_listen_time': str(history.total_listen_time)
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response({
                'detail': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class UserMusicHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserMusicHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserMusicHistory.objects.filter(user=self.request.user)
    
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import F, Sum

from .models import UserMusicHistory, Music

class MusicTrackingViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['POST'])
    def start_listening(self, request):
        music_id = request.data.get('music_id')
        try:
            music = Music.objects.get(id=music_id, is_public=True)
            
            listening_session, _ = UserMusicHistory.objects.get_or_create(
                user=request.user,
                music=music,
                defaults={
                    'start_time': timezone.now(),
                    'is_active': True
                }
            )

            return Response({
                'session_id': listening_session.id,
                'status': 'Listening started'
            }, status=status.HTTP_201_CREATED)

        except Music.DoesNotExist:
            return Response({
                'detail': 'Music not found or not public'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['PATCH'])
    def update_listening(self, request):
        music_id = request.data.get('music_id')
        duration = request.data.get('duration')
        
        try:
            listening_session = UserMusicHistory.objects.get(
                user=request.user,
                music_id=music_id
            )
            
            listening_session.total_listen_time = timezone.timedelta(seconds=duration)
            listening_session.last_played_at = timezone.now()
            listening_session.save()

            return Response({
                'total_listen_time': str(listening_session.total_listen_time),
            }, status=status.HTTP_200_OK)

        except UserMusicHistory.DoesNotExist:
            return Response({
                'detail': 'Listening session not found'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['GET'])
    def listening_stats(self, request):
        stats = UserMusicHistory.objects.filter(user=request.user).aggregate(
            total_plays=Sum('play_count'),
            total_listen_time=Sum('total_listen_time')
        )

        return Response({
            'total_plays': stats['total_plays'] or 0,
            'total_listen_time': str(stats['total_listen_time']),
        })