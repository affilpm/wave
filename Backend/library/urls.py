# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import LibraryViewSet
from .views import PlaylistLibraryView, PlaylistViewSet


router = DefaultRouter()
router.register(r'library', LibraryViewSet, basename='library')
router.register(r'playlist-data', PlaylistViewSet, basename='playlist')

# Get the router URLs
urlpatterns = router.urls
urlpatterns = [
    path('', include(router.urls)),
    path('playlists/', PlaylistLibraryView.as_view(), name='playlist_detail'),
    path('library/add-playlist/', views.LibraryViewSet.as_view({'post': 'add_playlist'}), name='library_add_playlist'),
    path('remove-playlist/', views.LibraryViewSet.as_view({'post': 'remove_playlist'}), name='library_remove_playlist'),
]