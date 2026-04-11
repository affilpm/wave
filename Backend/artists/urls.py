"""Artist app URL configuration."""

from django.urls import path

from artists.views import (
    ArtistAlbumCountView,
    ArtistDashboardStatsView,
    ArtistFollowCountView,
    ArtistFollowersListView,
    ArtistListenersView,
    ArtistRecentPlaysView,
    ArtistTotalPlaysView,
    ArtistTrackCountView,
    ArtistViewSet,
    FollowArtistView,
    HasAlbumsView,
    UserFollowingCountView,
    UserFollowingListView,
    check_artist_status,
)

urlpatterns = [
    # Artist verification and profile
    path("request_verification/", ArtistViewSet.as_view({"post": "request_verification"}), name="request_verification"),
    path("verification_status/", ArtistViewSet.as_view({"get": "verification_status"}), name="verification_status"),
    path("update_profile/", ArtistViewSet.as_view({"post": "update_profile"}), name="update_profile"),
    path("check-artist-status/", check_artist_status, name="check_artist_status"),

    # Artist dashboard stats
    path("dashboard-stats/", ArtistDashboardStatsView.as_view(), name="artist_dashboard_stats"),
    path("track-count/", ArtistTrackCountView.as_view(), name="artist_track_count"),
    path("album-count/", ArtistAlbumCountView.as_view(), name="artist_album_count"),
    path("listeners/", ArtistListenersView.as_view(), name="artist_listeners"),
    path("total-plays/", ArtistTotalPlaysView.as_view(), name="artist_total_plays"),
    path("artist-recent-plays/", ArtistRecentPlaysView.as_view(), name="artist_recent_plays"),
    path("has-albums/", HasAlbumsView.as_view(), name="has_albums"),

    # Follow / unfollow
    path("<int:artist_id>/follow/", FollowArtistView.as_view(), name="follow_artist"),
    path("<int:artist_id>/followers/", ArtistFollowersListView.as_view(), name="artist_followers"),
    path("<int:artist_id>/followers-count/", ArtistFollowCountView.as_view(), name="artist_followers_count"),
    path("me/following/", UserFollowingListView.as_view(), name="user_following"),
    path("me/following-count/", UserFollowingCountView.as_view(), name="user_following_count"),
]
