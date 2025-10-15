from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Artist, ArtistVerificationStatus
from .serializers import ArtistSerializer
from rest_framework.decorators import api_view, permission_classes
from users.models import CustomUser
from django.db.models import Sum
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Artist, Follow
from .serializers import FollowSerializer
from music.models import Album
from listening_history.models import ArtistPlayCount, ArtistActivity
from django.utils import timezone
from listening_history.models import RecentlyPlayed

class Pagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100         
    
    
    
# ViewSet for managing artists
class ArtistViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Artist.objects.all()
    serializer_class = ArtistSerializer
    pagination_class = Pagination

    # Custom action for requesting verification
    @action(detail=False, methods=['POST'])
    def request_verification(self, request):
        try:
            
            artist, created = Artist.objects.get_or_create(
                user=request.user,
                defaults={'bio': request.data.get('bio', '')}
            )

            if not created:
                artist.bio = request.data.get('bio', '')
                artist.status = ArtistVerificationStatus.PENDING
                artist.save()

            # Handle genres
            genres = request.data.get('genres', [])
            if genres:
                artist.genres.set(genres)  
                artist.save()

            return Response({
                'message': 'Success',
                'status': artist.status
            }, status=200)

        except Exception as e:

            return Response({'error': str(e)}, status=500)

    # Custom action for checking verification status
    @action(detail=False, methods=['GET'])
    def verification_status(self, request):
        try:
            artist = Artist.objects.get(user=request.user)
            return Response({'status': artist.status})
        except Artist.DoesNotExist:
            return Response({'status': None})

    # Custom action for listing artists
    # @action(detail=False, methods=['GET'])
    # def list_artists(self, request):
    #     try:
    #         artists = Artist.objects.all()
            
    #         # Apply pagination
    #         page = self.paginate_queryset(artists)
    #         if page is not None:
    #             artist_data = [
    #                 {
    #                     'id': artist.id,
    #                     'email': artist.user.email,
    #                     'bio': artist.bio,
    #                     'status': artist.status,
    #                     'genre': ', '.join([genre.name for genre in artist.genres.all()]),
    #                     'submitted_at': artist.submitted_at
    #                 }
    #                 for artist in page
    #             ]
    #             return self.get_paginated_response(artist_data)  # ✅ Correct DRF pagination response
            
    #         # If pagination is not applied, return manually paginated response
    #         artist_data = [
    #             {
    #                 'id': artist.id,
    #                 'email': artist.user.email,
    #                 'bio': artist.bio,
    #                 'status': artist.status,
    #                 'genre': ', '.join([genre.name for genre in artist.genres.all()]),
    #                 'submitted_at': artist.submitted_at
    #             }
    #             for artist in artists
    #         ]

    #         return Response({
    #             'count': len(artist_data),  # ✅ Ensuring total count is sent
    #             'next': None,
    #             'previous': None,
    #             'results': artist_data  # ✅ Consistent response format
    #         }, status=200)
        
    #     except Exception as e:
    #         return Response({'error': str(e)}, status=500)

    # # Custom action for updating artist status
    # @action(detail=True, methods=['POST'])
    # def update_status(self, request, pk=None):
    #     try:
    #         artist = Artist.objects.get(pk=pk)
    #         new_status = request.data.get('status')

    #         if not new_status:
    #             return Response({'error': 'Status is required'}, status=400)

    #         if new_status not in [status for status in ArtistVerificationStatus.values]:
    #             return Response({'error': 'Invalid status'}, status=400)

    #         artist.status = new_status
    #         artist.save()
    #         return Response({'status': artist.status}, status=200)
    #     except Artist.DoesNotExist:
    #         return Response({'error': 'Artist not found'}, status=404)
        

    # used to edit and resend verification request to become an artist.
    @action(detail=False, methods=['POST'])
    def update_profile(self, request):
        try:
            artist = Artist.objects.get(user=request.user)
            
            # Only allow updates if status is pending or rejected
            if artist.status not in [ArtistVerificationStatus.PENDING, ArtistVerificationStatus.REJECTED]:
                return Response(
                    {'error': 'Cannot update profile when status is approved'},
                    status=400
                )

            artist.bio = request.data.get('bio', artist.bio)
            
            genres = request.data.get('genres', [])
            if genres:
                artist.genres.set(genres)
            
            # If status is rejected, set it back to pending when profile is updated
            if artist.status == ArtistVerificationStatus.REJECTED:
                artist.status = ArtistVerificationStatus.PENDING
            
            artist.save()

            return Response({
                'message': 'Profile updated successfully',
                'status': artist.status,
                'bio': artist.bio,
                'genres': [genre.id for genre in artist.genres.all()]
            }, status=200)

        except Artist.DoesNotExist:
            return Response({'error': 'Artist not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)



#used to check if a user is an artist
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_artist_status(request):
    try:
        artist = Artist.objects.filter(user=request.user).first()
        
        response_data = {
            'is_artist': False,
            'status': None,
            'artist_id': None,
            'message': 'No artist profile found'
        }

        if artist:
            response_data.update({
                'is_artist': artist.status == 'approved',
                'status': artist.status,
                'artist_id': artist.id,
                'message': f'Artist profile found with status: {artist.status}'
            })

        return Response(response_data, status=200)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=400)        
        
        
        


class FollowArtistView(APIView):
    """
    View to follow/unfollow an artist.
    POST: Follow an artist
    DELETE: Unfollow an artist
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, artist_id):
        """Follow an artist"""
        artist = get_object_or_404(Artist, id=artist_id)
        
        # Check if user is trying to follow themselves
        if artist.user == request.user:
            return Response(
                {"detail": "You cannot follow yourself."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Check if already following
        follow, created = Follow.objects.get_or_create(
            user=request.user,
            artist=artist
        )
        
        if not created:
            return Response(
                {"detail": "You are already following this artist."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        serializer = FollowSerializer(follow)
        return Response(
            {
                "detail": f"You are now following {artist.user.username}.",
                "follow": serializer.data
            },
            status=status.HTTP_201_CREATED
        )
    
    def delete(self, request, artist_id):
        """Unfollow an artist"""
        artist = get_object_or_404(Artist, id=artist_id)
        
        # Try to find the follow relationship
        try:
            follow = Follow.objects.get(
                user=request.user,
                artist=artist
            )
            follow.delete()
            return Response(
                {"detail": f"You have unfollowed {artist.user.username}."},
                status=status.HTTP_200_OK
            )
        except Follow.DoesNotExist:
            return Response(
                {"detail": "You are not following this artist."},
                status=status.HTTP_400_BAD_REQUEST
            )


class ArtistFollowersListView(APIView):
    """
    View to get a list of followers for an artist.
    """
    
    def get(self, request, artist_id):
        """Get the list of followers for an artist"""
        artist = get_object_or_404(Artist, id=artist_id)
        followers = Follow.objects.filter(artist=artist)
        serializer = FollowSerializer(followers, many=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserFollowingListView(APIView):
    """
    View to get a list of artists a user is following.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get the list of artists the authenticated user is following"""
        following = Follow.objects.filter(user=request.user)
        serializer = FollowSerializer(following, many=True)

        return Response(serializer.data, status=status.HTTP_200_OK)
    
    
class ArtistFollowCountView(APIView):
    """
    View to get the count of followers for an artist.
    """
    
    def get(self, request, artist_id):
        """Get the count of followers for an artist"""
        artist = get_object_or_404(Artist, id=artist_id)
        followers_count = Follow.objects.filter(artist=artist).count()
        
        return Response({"followers_count": followers_count}, status=status.HTTP_200_OK)


class UserFollowingCountView(APIView):
    """
    View to get the count of artists a user is following.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get the count of artists the authenticated user is following"""
        following_count = Follow.objects.filter(user=request.user).count()
        
        return Response({"following_count": following_count}, status=status.HTTP_200_OK)    


class Artist_Trackcount(APIView):
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        
        artist = Artist.objects.filter(user = request.user).first()
        
        if not artist:
            return Response({'error': 'Artist Profile not Found'}, status=status.HTTP_404_NOT_FOUND)
        
        total_tracks = artist.musical_works.count()
        
        return Response({'total_tracks': total_tracks}, status=status.HTTP_200_OK)
    
    
class Artist_Albumcount(APIView):
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        
        artist = Artist.objects.filter(user =  request.user).first()
        
        if not artist:
            return Response({'error': 'Artist Profile not Found'}, status=status.HTTP_404_NOT_FOUND)
        
        total_albums = artist.albums.count()
        
        return Response({'total_albums': total_albums}, status=status.HTTP_200_OK)
    
    
class Artist_totalplays(APIView):
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        
        artist = Artist.objects.filter(user = request.user).first()
        
        if not artist:
            return Response({'error': 'Artist Profile not Found'}, status=status.HTTP_404_NOT_FOUND)
        
        artist_play = ArtistPlayCount.objects.filter(artist = artist).first()
        
        total_plays = artist_play.total_plays 
        
        return Response({'total_plays': total_plays}, status=status.HTTP_200_OK)    
    

class Artist_listeners(APIView):
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        
        artist = Artist.objects.filter(user = request.user).first()
        
        if not artist:
            return Response({'error': 'Artist Profile not Found'}, status=status.HTTP_404_NOT_FOUND)
        
        today = timezone.now().date()
        first_day_of_the_month = today.replace(day=1)
        
        total_listeners = ArtistActivity.objects.filter(
            artist=artist,
            last_played__gt = first_day_of_the_month
        ).values('user').exclude(user=artist.user).count()
     
        return Response({'total_listeners': total_listeners}, status=status.HTTP_200_OK)



class ArtistRecentPlaysView(APIView):
    """
    API endpoint to get the 3 most recently played songs of a given artist.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        artist = getattr(request.user, 'artist_profile', None)

        # Get RecentlyPlayed objects for songs uploaded by this artist
        recent_songs = (
            RecentlyPlayed.objects.filter(music__artist=artist)
            .select_related('music')
            .order_by('-last_played')[:3]
        )

        data = [
            {
                "music_id": rp.music.id,
                "name": rp.music.name,
                "cover_photo": request.build_absolute_uri(rp.music.cover_photo.url) if rp.music.cover_photo else None,
                "last_played": rp.last_played,
                "total_plays": getattr(rp.music.play_stats, 'total_plays', 0),
            }
            for rp in recent_songs
        ]

        return Response({"recently_played": data})
    

class HasAlbumsView(APIView):
    """
    API endpoint that returns a boolean indicating if the authenticated artist has any albums.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get the current user
        user = request.user
        
        # Check if the user has any albums
        # Adjust the query based on your actual relationship between User and Album
        has_albums = Album.objects.filter(artist__user=user).exists()
        
        # Return a simple boolean response
        return Response({'has_albums': has_albums})    