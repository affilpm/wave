from django.urls import path
from . import views
from .views import FollowArtistView, ArtistFollowersListView, UserFollowingListView, Artist_Albumcount, Artist_listeners, Artist_totalplays, Artist_Trackcount, ArtistFollowCountView, UserFollowingCountView

# Existing URL patterns
urlpatterns = [
    # Artist verification and profile URLs
    path('request_verification/', views.ArtistViewSet.as_view({'post': 'request_verification'}), name='request-verification'),
    path('verification_status/', views.ArtistViewSet.as_view({'get': 'verification_status'}), name='verification_status'),
    path('list_artists/', views.ArtistViewSet.as_view({'get': 'list_artists'}), name='list_artists'),
    path('<int:pk>/update_status/', views.ArtistViewSet.as_view({'post': 'update_status'}), name='update_status'),
    path('update_profile/', views.ArtistViewSet.as_view({'post': 'update_profile'}), name='update_profile'),
    path('check-artist-status/', views.check_artist_status, name='check-artist-status'),
    path('track-count/', Artist_Trackcount.as_view(), name='artist-track-count'),
    path('album-count/', Artist_Albumcount.as_view(), name='artist-album-count'),
    path('listeners/', Artist_listeners.as_view(), name='artist-listeners'),
    path('total-plays/', Artist_totalplays.as_view(), name='artist-total-plays'),
    
    # Artist following URLs
    path('<int:artist_id>/follow/', FollowArtistView.as_view(), name='follow-artist'),
    path('<int:artist_id>/followers/', ArtistFollowersListView.as_view(), name='artist-followers'),
    path('me/following/', UserFollowingListView.as_view(), name='user-following'),
    
    path('<int:artist_id>/followers-count/', ArtistFollowCountView.as_view()),
    path('me/following-count/', UserFollowingCountView.as_view()),

]
# Add these to your project's main urls.py
# path('api/', include('your_app_name.urls')),