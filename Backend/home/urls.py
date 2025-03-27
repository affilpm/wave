from django.urls import path, include
from .views import MusicListView, PlaylistView, AlbumListView, PublicGenresViewSet, get_music_by_genre, ArtistOnlyView, ArtistListView
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'public_genres', PublicGenresViewSet, basename='public_genres')


urlpatterns = [
    path('musiclist/', MusicListView.as_view(), name='music-list'),
    path('playlist/', PlaylistView.as_view(), name='playlist-list'),
    path('albumlist/', AlbumListView.as_view(), name='album-list'),
    path('artistlist/', ArtistOnlyView.as_view(), name='artist-list'),
    
    path('by-genre/<int:genre_id>/', get_music_by_genre, name='music-by-genre'),
    path('artistlist/<int:artist_id>/', ArtistOnlyView.as_view(), name='artist-detail'),
    path('artistshowmore/', ArtistListView.as_view(), name='artist-detail'),
    
    path('', include(router.urls)),
    # path('playlist-home/', views.home_playlist, name='home-playlist'),
]