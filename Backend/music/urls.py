from django.urls import path
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GenreViewSet, MusicViewSet, MusicVerificationViewSet, get_signed_token, MusicStreamView,  MusicMetadataView, PublicSongsView
router = DefaultRouter()
router.register(r'genres', GenreViewSet)

router.register(r'music', MusicViewSet)
router.register(r'music-verification', MusicVerificationViewSet, basename='music-verification')

# router.register(r'albums', AlbumViewSet, basename='album')
# router.register(r'tracks', TrackViewSet, basename='tracks')



urlpatterns = [
    path('', include(router.urls)),
    path('stream/<int:music_id>/', MusicStreamView.as_view()), 
    path('metadata/<int:music_id>/', MusicMetadataView.as_view()),
    path('public-songs/', PublicSongsView.as_view(), name='public-songs'),
    
    # path('recently-played/', RecentlyPlayedView.as_view(), name='recently_played' ),
    path('token/<int:music_id>/', get_signed_token, name='music-token'),
         
]