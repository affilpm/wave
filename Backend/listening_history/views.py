from django.shortcuts import render
from .models import PlayCount, PlayHistory
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response





    
    
    
    
    


from django.db.models import Count

class UserRecentlyPlayedView(APIView):
    permission_classes = [IsAuthenticated]
    
        
    

    def get(self, request):
        
        recent_plays = (
            PlayCount.objects.filter(user=request.user).select_related('music', 'music__artist', 'music__artist__user')
            .order_by('-last_played')[:10]        
        )
        
        data = [
            {
                "music_id": play.music.id,
                "title": play.music.name,
                "artist": play.music.artist.user.username,
                "play_count": play.count,
                "last_played": play.last_played.isoformat(),
                "cover_photo": request.build_absolute_uri(play.music.cover_photo.url) if play.music.cover_photo else None
            }
            for play in recent_plays
        ]
        
        return Response(data)