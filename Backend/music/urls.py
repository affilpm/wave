from django.urls import path
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GenreViewSet, MusicViewSet, MusicVerificationViewSet, PublicSongsView, SongsByArtistView, get_equalizer_presets, user_equalizer_preset, UserQualityPreferenceView, MusicStreamingView

router = DefaultRouter()
router.register(r'genres', GenreViewSet)

router.register(r'music', MusicViewSet)
router.register(r'music-verification', MusicVerificationViewSet, basename='music-verification')

# router.register(r'albums', AlbumViewSet, basename='album')
# router.register(r'tracks', TrackViewSet, basename='tracks')



urlpatterns = [
    path('', include(router.urls)),

    path('presets/', get_equalizer_presets, name='equalizer-presets'),
    path('user-preset/', user_equalizer_preset, name='user-equalizer-preset'),
    path('user-preset/', user_equalizer_preset, name='user-equalizer-preset'),
    path('public-songs/', PublicSongsView.as_view(), name='public-songs'),
    path('artist/<int:artist_id>/', SongsByArtistView.as_view(), name='songs-by-artist'),

    path('<int:music_id>/stream/', MusicStreamingView.as_view(), name='music-stream-preferred'),
    
    # User preferences endpoints
    path('user/preferences/', UserQualityPreferenceView.as_view(), name='user-preferences'),

         
]