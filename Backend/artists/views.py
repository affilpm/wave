from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Artist, ArtistVerificationStatus
from .serializers import ArtistSerializer
from rest_framework.decorators import api_view, permission_classes


class ArtistViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Artist.objects.all()
    serializer_class = ArtistSerializer

    # Custom action for requesting verification
    @action(detail=False, methods=['POST'])
    def request_verification(self, request):
        try:
            print("Received request to verify artist")  # Log for debugging
            artist, created = Artist.objects.get_or_create(
                user=request.user,
                defaults={'bio': request.data.get('bio', '')}
            )
            print(f"Artist: {artist}, Created: {created}") 

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
            print(f"Error: {str(e)}")
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
    @action(detail=False, methods=['GET'])
    def list_artists(self, request):
        try:
            artists = Artist.objects.all() 
            artist_data = [
                {
                    'id': artist.id,
                    'email': artist.user.email,
                    'bio': artist.bio,
                    'status': artist.status,
                    'genre': ', '.join([genre.name for genre in artist.genres.all()]),
                    'submitted_at': artist.submitted_at
                }
                for artist in artists
            ]
            return Response({'artists': artist_data}, status=200)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    # Custom action for updating artist status
    @action(detail=True, methods=['POST'])
    def update_status(self, request, pk=None):
        try:
            artist = Artist.objects.get(pk=pk)
            new_status = request.data.get('status')

            if not new_status:
                return Response({'error': 'Status is required'}, status=400)

            if new_status not in [status for status in ArtistVerificationStatus.values]:
                return Response({'error': 'Invalid status'}, status=400)

            artist.status = new_status
            artist.save()
            return Response({'status': artist.status}, status=200)
        except Artist.DoesNotExist:
            return Response({'error': 'Artist not found'}, status=404)
        

    
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



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_artist_status(request):
    try:
        artist = Artist.objects.filter(user=request.user).first()
        
        response_data = {
            'is_artist': False,
            'status': None,
            'message': 'No artist profile found'
        }

        if artist:
            response_data.update({
                'is_artist': artist.status == 'approved',
                'status': artist.status,
                'message': f'Artist profile found with status: {artist.status}'
            })

        return Response(response_data, status=200)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=400)        