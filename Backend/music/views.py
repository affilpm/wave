from django.shortcuts import render
from .models import Genre, Music
from .serializers import GenreSerializer, MusicSerializer
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from .models import Music, MusicApprovalStatus
from .serializers import MusicVerificationSerializer

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Album
from .serializers import AlbumSerializer


class GenreViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    
    



class MusicViewSet(ModelViewSet):
    queryset = Music.objects.all()
    serializer_class = MusicSerializer
    parser_classes = (MultiPartParser, FormParser)

    def create(self, request, *args, **kwargs):
        try:
            # Print incoming data for debugging
            print("Request data:", request.data)
            print("Request FILES:", request.FILES)
            
            artist = request.user.artist_profile

            music_data = {
                'name': request.data.get('name'),
                'release_date': request.data.get('release_date'),
                'artist': artist.id
            }

            # Handle file uploads
            if 'audio_file' in request.FILES:
                music_data['audio_file'] = request.FILES['audio_file']
            if 'cover_photo' in request.FILES:
                music_data['cover_photo'] = request.FILES['cover_photo']
            if 'video_file' in request.FILES:
                music_data['video_file'] = request.FILES['video_file']

            # Handle genres
            genres = request.data.getlist('genres')
            if genres:
                music_data['genres'] = genres

            # Print the processed data for the serializer
            print("Processed data for serializer:", music_data)

            serializer = self.get_serializer(data=music_data)
            
            # Validate the serializer data
            if not serializer.is_valid():
                print("Serializer Errors:", serializer.errors)
                return Response(
                    {'error': 'Validation failed', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Perform the creation of the music object
            self.perform_create(serializer)

            # Create a success response with the created data
            response_data = {
                'message': 'Music track created successfully',
                'music': serializer.data
            }

            headers = self.get_success_headers(serializer.data)

            return Response(
                response_data,
                status=status.HTTP_201_CREATED,
                headers=headers
            )

        except Exception as e:
            # Handle any unexpected errors
            print(f"Unexpected error: {str(e)}")
            return Response(
                {'error': 'An unexpected error occurred', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    def get_queryset(self):
        # Filter music by the logged-in user's artist profile and approved status
        return Music.objects.filter(artist=self.request.user.artist_profile, approval_status=MusicApprovalStatus.APPROVED)     

            
            

import json
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
class AlbumViewSet(viewsets.ModelViewSet):
    serializer_class = AlbumSerializer
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Album.objects.filter(artist=self.request.user.artist_profile)
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        try:
            # Extract tracks data from request
            tracks_data = []
            if 'tracks' in request.data:
                tracks_data = json.loads(request.data['tracks'])
                del request.data['tracks']
            
            # Create serializer with album data
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Add artist to validated data
            serializer.validated_data['artist'] = request.user.artist_profile
            
            # Save album
            album = serializer.save()
            
            # Create album tracks
            for track_data in tracks_data:
                AlbumTrack.objects.create(
                    album=album,
                    track_id=track_data['track'],
                    track_number=track_data['track_number']
                )
            
            # Return updated album data
            serializer = self.get_serializer(album)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def drafts(self, request):
        drafts = self.get_queryset().filter(status='draft')
        serializer = self.get_serializer(drafts, many=True)
        return Response(serializer.data)







from rest_framework.response import Response
from rest_framework.decorators import action
from .models import AlbumTrack
from .serializers import AlbumTrackSerializer
from rest_framework.permissions import IsAuthenticated

class TrackViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AlbumTrackSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter AlbumTrack by the artist associated with the logged-in user.
        Only tracks belonging to albums created by the logged-in user's artist profile are shown.
        """
        user = self.request.user
        # Filter tracks by the logged-in user's artist profile
        return AlbumTrack.objects.filter(album__artist=user.artist_profile)
    @action(detail=False, methods=['get'])
    def available_tracks(self, request):
        """
        Fetch tracks available for the authenticated user.
        This method returns tracks from albums associated with the user's artist profile.
        """
        tracks = self.get_queryset()
        serializer = self.get_serializer(tracks, many=True)
        return Response(serializer.data)
    
    
    
    
    
    
    
    

class MusicVerificationViewSet(viewsets.ModelViewSet):
    serializer_class = MusicVerificationSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        # prefetch_related for genres and select_related for related artist and user
        return Music.objects.all().select_related('artist', 'artist__user').prefetch_related('genres').order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        music = self.get_object()
        music.approval_status = MusicApprovalStatus.APPROVED
        music.save()
        return Response({
            'status': 'approved',
            'music_id': music.id
        })
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        music = self.get_object()
        music.approval_status = MusicApprovalStatus.REJECTED
        music.save()
        return Response({
            'status': 'rejected',
            'music_id': music.id
        })
        
        
        


