from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ArtistViewSet
from . import views

urlpatterns = [
    # Explicitly define the URL for the request_verification action
    path('request_verification/', ArtistViewSet.as_view({'post': 'request_verification'}), name='request-verification'),
    path('verification_status/', ArtistViewSet.as_view({'get': 'verification_status'}), name='verification_status'),
    path('list_artists/', ArtistViewSet.as_view({'get': 'list_artists'}), name='list_artists'),
    path('<int:pk>/update_status/', ArtistViewSet.as_view({'post': 'update_status'}), name='update_status'),
    path('check-artist-status/', views.check_artist_status, name='check-artist-status'),
    
]