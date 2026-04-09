from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from django.db.models import Max

from .models import MusicActivityType, ListeningHistory
from .serializers import ListeningHistorySerializer
from .utils.record_activity import record_activity
from music.models import Music, Album
from album.serializers import AlbumSerializer


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def log_activity(request, music_id):
    """
    API to record user activity with context tracking.
    """
    music = get_object_or_404(Music, id=music_id)
    activity_type = request.data.get("activity_type", MusicActivityType.PLAY)
    source_type = request.data.get("source_type")
    source_id = request.data.get("source_id")

    # Call helper with context
    record_activity(
        user=request.user, 
        music=music, 
        activity_type=activity_type,
        source_type=source_type,
        source_id=source_id
    )

    return Response({"success": True, "activity_type": activity_type})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recently_played(request):
    """
    Returns the user's 20 most recently played tracks with full context.
    """
    history = ListeningHistory.objects.filter(user=request.user).select_related(
        'track', 'track__artist', 'track__artist__user', 'album', 'artist', 'artist__user'
    ).order_by('-last_played_at')[:20]
    serializer = ListeningHistorySerializer(history, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def jump_back_in(request):
    """
    Returns unique albums and individual tracks (singles) from recent history.
    """
    # 1. Get unique albums where the user actually played the album as an album
    recent_album_history = ListeningHistory.objects.filter(
        user=request.user, 
        album__is_public=True,
        source_type=ListeningHistory.SourceType.ALBUM
    ).values('album').annotate(
        recent_play=Max('last_played_at')
    ).order_by('-recent_play')[:10]
    
    album_ids = [item['album'] for item in recent_album_history]
    
    albums = []
    if album_ids:
        # Fetch actual album objects maintaining order
        album_objs = {a.id: a for a in Album.objects.filter(id__in=album_ids).select_related('artist', 'artist__user')}
        for aid in album_ids:
            if aid in album_objs:
                albums.append(album_objs[aid])
                
    # 2. Get individual tracks played as singles (not via album context)
    # We want recently played tracks where the source was NOT album
    recent_singles_history = ListeningHistory.objects.filter(
        user=request.user
    ).exclude(
        source_type=ListeningHistory.SourceType.ALBUM
    ).select_related(
        'track', 'track__artist', 'track__artist__user'
    ).order_by('-last_played_at')[:10]
    
    singles = [item.track for item in recent_singles_history]
    
    # Serialize data
    from music.serializers import MusicDataSerializer
    serialized_albums = AlbumSerializer(albums, many=True, context={'request': request}).data
    serialized_singles = MusicDataSerializer(singles, many=True, context={'request': request}).data
    
    response_data = {
        "albums": serialized_albums,
        "singles": serialized_singles,
        "has_singles": len(serialized_singles) > 0
    }
    
    return Response(response_data)