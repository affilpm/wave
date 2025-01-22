from django.urls import path, include
from .views import MusicListView, PlaylistView, AlbumListView
from rest_framework.routers import DefaultRouter
from . import views

# router = DefaultRouter()
# router.register(r'library', views.LibraryViewSet, basename='library')
# router.register(r'playlists', views.PlaylistViewSet, basename='playlist')

urlpatterns = [
    path('musiclist/', MusicListView.as_view(), name='music-list'),
    path('playlist/', PlaylistView.as_view(), name='playlist-list'),
    path('albumlist/', AlbumListView.as_view(), name='album-list'),
    # path('', include(router.urls)),
    path('playlist-home/', views.home_playlist, name='home-playlist'),
]