from django.urls import path
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GenreViewSet, MusicViewSet, MusicVerificationViewSet, PublicSongsView, SongsByArtistView, get_equalizer_presets, user_equalizer_preset, UserQualityPreferenceView, MusicStreamingView
from . import views

router = DefaultRouter()
router.register(r'genres', GenreViewSet)
router.register(r'music', MusicViewSet)
router.register(r'music-verification', MusicVerificationViewSet, basename='music_verification')

urlpatterns = [
    path('', include(router.urls)),

    path('presets/', get_equalizer_presets, name='equalizer_presets'),
    path('user-preset/', user_equalizer_preset, name='user_equalizer_preset'),
    path('public-songs/', PublicSongsView.as_view(), name='public_songs'),
    path('artist/<int:artist_id>/', SongsByArtistView.as_view(), name='songs_by_artist'),

    path('<int:music_id>/stream/', MusicStreamingView.as_view(), name='music_stream_preferred'),
    
    # User preferences endpoints
    path('user/quality-preference/', UserQualityPreferenceView.as_view(), name='user_quality_preference'),
    path('user/update-preference/', views.UpdateUserPreferenceView.as_view(), name='update_preference'),
    

         
]