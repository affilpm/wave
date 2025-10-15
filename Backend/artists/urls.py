from django.urls import path
from . import views
from .views import FollowArtistView, ArtistFollowersListView, UserFollowingListView, Artist_Albumcount, Artist_listeners, Artist_totalplays, Artist_Trackcount, ArtistFollowCountView, UserFollowingCountView, HasAlbumsView, ArtistRecentPlaysView

urlpatterns = [
    # Artist verification and profile URLs
    path('request_verification/', views.ArtistViewSet.as_view({'post': 'request_verification'}), name='request_erification'),
    path('verification_status/', views.ArtistViewSet.as_view({'get': 'verification_status'}), name='verification_status'),
    path('list_artists/', views.ArtistViewSet.as_view({'get': 'list_artists'}), name='list_artists'),
    path('<int:pk>/update_status/', views.ArtistViewSet.as_view({'post': 'update_status'}), name='update_status'),
    path('update_profile/', views.ArtistViewSet.as_view({'post': 'update_profile'}), name='update_profile'),
    path('check-artist-status/', views.check_artist_status, name='check_artist_status'),
    path('track-count/', Artist_Trackcount.as_view(), name='artist_track_count'),
    path('album-count/', Artist_Albumcount.as_view(), name='artist_album_count'),
    path('listeners/', Artist_listeners.as_view(), name='artist_listeners'),
    path('total-plays/', Artist_totalplays.as_view(), name='artist_total_plays'),
    path('artist-recent-plays/', ArtistRecentPlaysView.as_view(), name='artist_recent_plays'),
    
    # Artist following URLs
    path('<int:artist_id>/follow/', FollowArtistView.as_view(), name='follow_artist'),
    path('<int:artist_id>/followers/', ArtistFollowersListView.as_view(), name='artist_followers'),
    path('me/following/', UserFollowingListView.as_view(), name='user_following'),
    
    path('<int:artist_id>/followers-count/', ArtistFollowCountView.as_view()),
    path('me/following-count/', UserFollowingCountView.as_view()),
    path('has-albums/', HasAlbumsView.as_view(), name='has_albums'),

]
