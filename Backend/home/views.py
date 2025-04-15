# views.py
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from music.models import Music, Album
from artists.models import Artist
from playlist.models import Playlist
from .serializers import Music_ListSerializer, Playlist_ListSerializer, Album_ListSerializer, ArtistSerializer
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


    
    
    
    
class ArtistOnlyView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        artist_id = kwargs.get('artist_id')
        if artist_id:
            try:
                artist = Artist.objects.get(id=artist_id)
                if artist.user == request.user:
                    return Response(
                        {"error": "You cannot view your own artist data."}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                        
                has_public_music = artist.musical_works.filter(is_public=True).exists()
                if not has_public_music:
                    return Response(
                        {"error": "You cannot view your own artist data."},
                        status=status.HTTP_403_FORBIDDEN
                    )        
                serializer = ArtistSerializer(artist, context={'request': request})
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Artist.DoesNotExist:
                return Response(
                    {"error": "Artist not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Filter artists excluding the current user and with public musical works
            artists = Artist.objects.exclude(user=request.user).filter(musical_works__is_public=True).distinct()
            
            # Limit to 10 artists
            artists = artists[:10]
            
            serializer = ArtistSerializer(artists, many=True, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        
   
class ArtistListView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = Pagination
    
    def get(self, request, *args, **kwargs):
        artist_id = kwargs.get('artist_id')
        if artist_id:
            try:
                artist = Artist.objects.get(id=artist_id)
                if artist.user == request.user:
                    return Response(
                        {"error": "You cannot view your own artist data."}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                        
                has_public_music = artist.musical_works.filter(is_public=True).exists()
                if not has_public_music:
                    return Response(
                        {"error": "You cannot view your own artist data."},
                        status=status.HTTP_403_FORBIDDEN
                    )        
                serializer = ArtistSerializer(artist, context={'request': request})
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Artist.DoesNotExist:
                return Response(
                    {"error": "Artist not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Filter artists excluding the current user and with public musical works
            artists = Artist.objects.exclude(user=request.user).filter(musical_works__is_public=True).distinct()
            
            # Apply pagination
            paginator = self.pagination_class()
            paginated_artists = paginator.paginate_queryset(artists, request)
            
            serializer = ArtistSerializer(paginated_artists, many=True, context={'request': request})
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




@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_music(request):
    """
    Search for music by name, artist name, or genre
    """
    query = request.GET.get('query', '')
    
    if not query:
        return Response(
            {'error': 'Query parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Search music by name, artist name, or genre
    music = Music.objects.filter(
        Q(approval_status='approved') & 
        Q(is_public=True) &
        (
            Q(name__icontains=query) | 
            Q(artist__user__username__icontains=query) |
            Q(genres__name__icontains=query)
        )
    ).distinct()
    
    # Format the response
    results = Music_ListSerializer(music, many=True).data
    
    # Add additional fields needed for the player
    for item in results:
        music_obj = Music.objects.get(id=item['id'])
        item['audio_file'] = music_obj.audio_file.url if music_obj.audio_file else None
        item['video_file'] = music_obj.video_file.url if music_obj.video_file else None
        item['artist_id'] = music_obj.artist.id
        item['duration'] = str(music_obj.duration) if music_obj.duration else None
    
    return Response({
        'results': results,
        'count': len(results)
    })