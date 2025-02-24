# views.py
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from music.models import Music, Album
from playlist.models import Playlist
from .serializers import Music_ListSerializer, Playlist_ListSerializer, Album_ListSerializer
from rest_framework.decorators import api_view, permission_classes
from playlist.serializers import PlaylistSerializer
from django.db.models import Q
from rest_framework.pagination import PageNumberPagination
from rest_framework import viewsets
from music.models import Genre, MusicApprovalStatus
from music.serializers import GenreSerializer, MusicDataSerializer


class Pagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class MusicListView(generics.ListAPIView):
    serializer_class = Music_ListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = Pagination
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_queryset(self):
        # Check if the 'top10' query parameter is present
        top10 = self.request.query_params.get('top10', None)
        all_songs = self.request.query_params.get('all_songs', None)

        if top10 is not None:
            # If 'top10' is present, limit to the top 10 public music items
            return Music.objects.filter(is_public=True).select_related('artist').order_by('-created_at')[:10]
        elif all_songs is not None:
            # If 'all_songs' is present, return all public music items
            return Music.objects.filter(is_public=True).select_related('artist')
        else:
            # Default: return all public music items
            return Music.objects.filter(is_public=True).select_related('artist')
    
    # def get_paginated_response(self, data):
        
    #     paginator = self.paginator
    #     total_pages = paginator.page.paginator.num_pages
    #     return Response({
    #         'count': self.pagination.page.paginator.count,
    #         'total_pages': total_pages,
    #         'results': data
    #     })    

    
    
class PlaylistView(generics.ListAPIView):
    serializer_class = Playlist_ListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = Pagination
    
    def get_queryset(self):
        top10 = self.request.query_params.get('top10', None)
        all_playlists = self.request.query_params.get('all_playlists', None)
        
        queryset = Playlist.objects.filter(
            is_public=True,
            playlisttrack__music__is_public=True 
        ).exclude(
            created_by=self.request.user
        ).distinct()  

        if top10 is not None:
            return queryset.order_by('-created_at')[:10]
        
        return queryset.order_by('-created_at')
        

class AlbumListView(generics.ListAPIView):
    serializer_class = Album_ListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = Pagination
    
    def get_queryset(self):
        top10 = self.request.query_params.get('top10', None)
        all_playlists = self.request.query_params.get('all_playlists', None)
        
        queryset = Album.objects.filter(
            is_public=True,
            albumtrack__track__is_public=True  
        ).distinct()
        
        if top10 is not None:
            return queryset.order_by('-created_at')[:10]
        
        return queryset.order_by('-created_at')
  


class PublicGenresViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Genre.objects.filter(musical_works__is_public=True).distinct()
    serializer_class = GenreSerializer
    
    
    



    



@api_view(['GET'])
def get_music_by_genre(request, genre_id):
    music = Music.objects.filter(
        genres__id=genre_id,
        approval_status=MusicApprovalStatus.APPROVED,
        is_public=True
    ).select_related('artist__user').order_by('-created_at')
    
    paginator = Pagination()
    result_page = paginator.paginate_queryset(music, request)
    serializer = MusicDataSerializer(result_page, many=True)
    return paginator.get_paginated_response(serializer.data)


    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def home_playlist(request):
    """
    Get playlists for home page:
    - Public playlists
    - User's own playlists
    - Playlists in user's library
    """
    user = request.user
    
    # Get user's library playlists and public playlists
    playlists = Playlist.objects.filter(
        Q(is_public=True) |
        Q(created_by=user) |
        Q(user_libraries__user=user)
    ).distinct().order_by('-created_at')[:10]  # Get latest 10 playlists
    
    serializer = PlaylistSerializer(playlists, many=True)
    return Response(serializer.data)