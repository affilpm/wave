from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import MusicActivityType
from music.models import Music
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from .utils.record_activity import record_activity

    
    
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