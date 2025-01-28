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
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Album
# from .serializers import AlbumSerializer
from mutagen.mp3 import MP3
from mutagen.wavpack import WavPack
from mutagen import File
from .models import AlbumTrack
# from .serializers import AlbumTrackSerializer
from django.core.exceptions import ValidationError
from django.db import IntegrityError
import json





class GenreViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    permission_classes = [IsAuthenticated]
    
    




##


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

            # Check for duplicate music name
            if Music.objects.filter(name=music_data['name'], artist=artist).exists():
                return Response(
                    {'error': 'Duplicate music name is not allowed for the same artist'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Handle file uploads
            audio_file = None
            if 'audio_file' in request.FILES:
                audio_file = request.FILES['audio_file']
                music_data['audio_file'] = audio_file

            # Extract audio duration if the audio file exists
            if audio_file:
                # Get the duration of the audio file using mutagen
                audio = File(audio_file)
                if audio is not None:
                    duration = audio.info.length  # Duration in seconds
                    music_data['duration'] = duration

            if 'cover_photo' in request.FILES:
                music_data['cover_photo'] = request.FILES['cover_photo']
            if 'video_file' in request.FILES:
                music_data['video_file'] = request.FILES['video_file']

            # Handle genres
            genres = request.data.getlist('genres[]')  # Note the '[]' suffix
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

        except IntegrityError as e:
            print(f"IntegrityError: {str(e)}")
            return Response(
                {'error': 'Integrity Error', 'details': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # Handle any unexpected errors
            print(f"Unexpected error: {str(e)}")
            return Response(
                {'error': 'An unexpected error occurred', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    @action(detail=False, methods=['get'])
    def check_name(self, request):
        name = request.query_params.get('name', '').strip()
        artist = request.user.artist_profile
        
        exists = Music.objects.filter(
            name__iexact=name, 
            artist=artist
        ).exists()
        
        return Response({
            'exists': exists
        })
        
        
    def get_queryset(self):
        queryset = Music.objects.filter(
            artist__user=self.request.user,
        ).select_related('artist__user').prefetch_related('genres')

        print(f"Queryset for user {self.request.user}: {queryset}")
        return queryset
        
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Completely delete the music file and cover photo
        if instance.audio_file:
            instance.audio_file.delete(save=False)
        if instance.video_file:
            instance.video_file.delete(save=False)
        if instance.cover_photo:
            instance.cover_photo.delete(save=False)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['POST'])
    def toggle_visibility(self, request, pk=None):
        music = self.get_object()
        music.is_public = not music.is_public
        music.save()
        return Response({'is_public': music.is_public})
    
      

###
         


    
    
    
    
    
##   admin side 
    
    

class MusicVerificationViewSet(viewsets.ModelViewSet):
    serializer_class = MusicVerificationSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        return Music.objects.select_related(
            'artist', 
            'artist__user'
        ).prefetch_related(
            'genres'
        ).order_by('-created_at')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        try:
            music = self.get_object()
            music.approval_status = MusicApprovalStatus.APPROVED
            # music.is_public = True
            music.save()
            
            # Re-serialize the updated object
            serializer = self.get_serializer(music)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        try:
            music = self.get_object()
            music.approval_status = MusicApprovalStatus.REJECTED
            music.save()
            
            # Re-serialize the updated object
            serializer = self.get_serializer(music)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        


