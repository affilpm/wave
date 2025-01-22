# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'playlists', views.PlaylistViewSet, basename='playlist')

urlpatterns = [
    path('', include(router.urls)),
    # Add specific library endpoints
    path('library/add-playlist/', views.LibraryViewSet.as_view({'post': 'add_playlist'}), name='library-add-playlist'),
    path('library/remove-playlist/', views.LibraryViewSet.as_view({'post': 'remove_playlist'}), name='library-remove-playlist'),
]