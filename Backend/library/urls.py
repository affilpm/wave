# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import LibraryViewSet
from .views import PlaylistLibraryView, PlaylistViewSet


router = DefaultRouter()
router.register(r'library', LibraryViewSet, basename='library')
router.register(r'playlist_data', PlaylistViewSet, basename='playlist')

# Get the router URLs
urlpatterns = router.urls
urlpatterns = [
    path('', include(router.urls)),
    path('playlists/', PlaylistLibraryView.as_view(), name='playlist-detail'),
    # path('tracks/', UserTracksView.as_view(), name='user-tracks'),
    # path('tracks/detailed/', UserTracksDetailView.as_view(), name='user-tracks-detailed'),
    # path('', include(router.urls)),
    # Add specific library endpoints
    # path('p/', LibraryPlaylistView.as_view(), name='library-playlists'),
    path('library/add-playlist/', views.LibraryViewSet.as_view({'post': 'add_playlist'}), name='library-add-playlist'),
    path('remove_playlist/', views.LibraryViewSet.as_view({'post': 'remove_playlist'}), name='library-remove-playlist'),
]