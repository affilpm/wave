from django.urls import path, include
from .views import MusicListView, PlaylistView, AlbumListView, PublicGenresViewSet, get_music_by_genre, ArtistOnlyView, ArtistListView
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'public-genres', PublicGenresViewSet, basename='public_genres')


urlpatterns = [
    path('search/', views.search_music, name='search_music'),
    path('musiclist/', MusicListView.as_view(), name='music_list'),
    path('playlist/', PlaylistView.as_view(), name='playlist_list'),
    path('albumlist/', AlbumListView.as_view(), name='album_list'),
    path('artistlist/', ArtistOnlyView.as_view(), name='artist_list'),
    
    path('by-genre/<int:genre_id>/', get_music_by_genre, name='music_by_genre'),
    path('artistlist/<int:artist_id>/', ArtistOnlyView.as_view(), name='artist_detail'),
    path('artistshowmore/', ArtistListView.as_view(), name='artist_detail'),
    
    path('', include(router.urls)),

]