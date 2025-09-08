from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import MusicActivityType
from music.models import Music
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from .utils.record_activity import record_activity

# class UserRecentlyPlayedView(APIView):
#     permission_classes = [IsAuthenticated]
    
#     def get(self, request):
#         # Fetch the most recent 10 unique music plays for the authenticated user
#         recent_plays = (
#             PlaySession.objects.filter(user=request.user, status='completed')
#             .select_related('music', 'music__artist', 'music__artist__user')  # Use select_related to minimize queries
#             .order_by('-started_at')  # Order by the most recent play session
#         )
        
#         # Use a dictionary to filter out duplicates based on music ID, retaining only the most recent one
#         unique_plays = {}
#         for play in recent_plays:
#             if play.music.id not in unique_plays:
#                 unique_plays[play.music.id] = play
        
#         # Get the latest 10 unique plays based on the most recent session
#         data = [
#             {
#                 "music_id": play.music.id,
#                 "title": play.music.name,
#                 "artist": play.music.artist.user.username,
#                 "play_count": play.music.playsession_set.filter(status='completed').count(),
#                 "last_played": play.started_at.isoformat(),
#                 "cover_photo": request.build_absolute_uri(play.music.cover_photo.url) if play.music.cover_photo else None
#             }
#             for play in unique_plays.values()
#         ][:10]  # Limit to the top 10 unique plays
        
#         return Response(data)
    
    
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def log_activity(request, music_id):
    """
    API to record user activity (play, complete)
    """
    music = get_object_or_404(Music, id=music_id)
    activity_type = request.data.get("activity_type", MusicActivityType.PLAY)

    # Call helper
    record_activity(request.user, music, activity_type)

    return Response({"success": True, "activity_type": activity_type})