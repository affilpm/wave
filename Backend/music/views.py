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




class GenreViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer
    
    


class MusicViewSet(ModelViewSet):
    queryset = Music.objects.all()
    serializer_class = MusicSerializer
    parser_classes = (MultiPartParser, FormParser)

    def create(self, request, *args, **kwargs):
        try:
            
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

            print("Processed data for serializer:", music_data)

            serializer = self.get_serializer(data=music_data)
            
            if not serializer.is_valid():
                print("Serializer Errors:", serializer.errors)
                return Response(
                    serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST
                )

            self.perform_create(serializer)
            
            headers = self.get_success_headers(serializer.data)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED,
                headers=headers
            )
            
        except Exception as e:
            print("Exception in create:", str(e))
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
            
            




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