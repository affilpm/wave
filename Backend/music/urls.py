from django.urls import path
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GenreViewSet, MusicViewSet, MusicVerificationViewSet, get_signed_token, MusicStreamView,  MusicMetadataView, PublicSongsView, SongsByArtistView, EqualizerPresetDetailView, EqualizerPresetListCreateView, CurrentEqualizerView, Record_play_completion
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
    path('equalizer/presets/', EqualizerPresetListCreateView.as_view(), name='equalizer-presets'),
    path('equalizer/presets/<int:pk>/', EqualizerPresetDetailView.as_view(), name='equalizer-preset-detail'),
    path('equalizer/current/', CurrentEqualizerView.as_view(), name='current-equalizer'),    
    path('public-songs/', PublicSongsView.as_view(), name='public-songs'),
    path('artist/<int:artist_id>/', SongsByArtistView.as_view(), name='songs-by-artist'),
    path('record_play_completion/', Record_play_completion, name='record_play_completion'),
    # path('recently-played/', RecentlyPlayedView.as_view(), name='recently_played' ),
    path('token/<int:music_id>/', get_signed_token, name='music-token'),
         
]