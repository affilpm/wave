"""
Artist API views — verification, follow/unfollow, artist stats, and profiles.
"""

from __future__ import annotations

import logging

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from artists.models import Artist, ArtistVerificationStatus, Follow
from artists.serializers import ArtistSerializer, FollowSerializer
from listening_history.models import ArtistActivity, ArtistPlayCount, RecentlyPlayed
from music.models import Album

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

class ArtistPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


# ---------------------------------------------------------------------------
# Artist verification & profile management
# ---------------------------------------------------------------------------

class ArtistViewSet(viewsets.ModelViewSet):
    """Authenticated user's artist profile management."""

    permission_classes = [IsAuthenticated]
    queryset = Artist.objects.select_related("user").prefetch_related("genres")
    serializer_class = ArtistSerializer
    pagination_class = ArtistPagination

    @action(detail=False, methods=["post"])
    def request_verification(self, request):
        """Submit or re-submit an artist verification request."""
        artist, created = Artist.objects.get_or_create(
            user=request.user,
            defaults={"bio": request.data.get("bio", "")},
        )

        if not created:
            artist.bio = request.data.get("bio", artist.bio)
            artist.status = ArtistVerificationStatus.PENDING
            artist.save(update_fields=["bio", "status", "updated_at"])

        genres = request.data.get("genres", [])
        if genres:
            artist.genres.set(genres)

        return Response({"message": "Success", "status": artist.status})

    @action(detail=False, methods=["get"])
    def verification_status(self, request):
        """Check the current user's artist verification status."""
        try:
            artist = Artist.objects.get(user=request.user)
            return Response({"status": artist.status})
        except Artist.DoesNotExist:
            return Response({"status": None})

    @action(detail=False, methods=["post"])
    def update_profile(self, request):
        """Update artist profile (only when pending or rejected)."""
        try:
            artist = Artist.objects.get(user=request.user)
        except Artist.DoesNotExist:
            return Response({"error": "Artist not found"}, status=status.HTTP_404_NOT_FOUND)

        if artist.status not in (ArtistVerificationStatus.PENDING, ArtistVerificationStatus.REJECTED):
            return Response(
                {"error": "Cannot update profile when status is approved"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        artist.bio = request.data.get("bio", artist.bio)
        genres = request.data.get("genres", [])
        if genres:
            artist.genres.set(genres)

        if artist.status == ArtistVerificationStatus.REJECTED:
            artist.status = ArtistVerificationStatus.PENDING

        artist.save(update_fields=["bio", "status", "updated_at"])

        return Response({
            "message": "Profile updated successfully",
            "status": artist.status,
            "bio": artist.bio,
            "genres": list(artist.genres.values_list("id", flat=True)),
        })


# ---------------------------------------------------------------------------
# Artist status check
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_artist_status(request) -> Response:
    """Check whether the current user has an artist profile and its status."""
    artist = Artist.objects.filter(user=request.user).first()

    data = {
        "is_artist": False,
        "status": None,
        "artist_id": None,
        "message": "No artist profile found",
    }

    if artist:
        data.update({
            "is_artist": artist.status == ArtistVerificationStatus.APPROVED,
            "status": artist.status,
            "artist_id": artist.id,
            "message": f"Artist profile found with status: {artist.status}",
        })

    return Response(data)


# ---------------------------------------------------------------------------
# Follow / unfollow
# ---------------------------------------------------------------------------

class FollowArtistView(APIView):
    """Follow (POST) or unfollow (DELETE) an artist."""

    permission_classes = [IsAuthenticated]

    def post(self, request, artist_id: int) -> Response:
        artist = get_object_or_404(Artist, id=artist_id)

        if artist.user == request.user:
            return Response(
                {"detail": "You cannot follow yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        follow, created = Follow.objects.get_or_create(user=request.user, artist=artist)
        if not created:
            return Response(
                {"detail": "You are already following this artist."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = FollowSerializer(follow)
        return Response(
            {"detail": f"You are now following {artist.user.username}.", "follow": serializer.data},
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, artist_id: int) -> Response:
        artist = get_object_or_404(Artist, id=artist_id)
        try:
            Follow.objects.get(user=request.user, artist=artist).delete()
            return Response({"detail": f"You have unfollowed {artist.user.username}."})
        except Follow.DoesNotExist:
            return Response(
                {"detail": "You are not following this artist."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ArtistFollowersListView(APIView):
    """List all followers for a given artist."""

    def get(self, request, artist_id: int) -> Response:
        artist = get_object_or_404(Artist, id=artist_id)
        followers = Follow.objects.filter(artist=artist).select_related("user")
        return Response(FollowSerializer(followers, many=True).data)


class UserFollowingListView(APIView):
    """List all artists the current user follows."""

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        following = Follow.objects.filter(user=request.user).select_related("artist", "artist__user")
        return Response(FollowSerializer(following, many=True).data)


class ArtistFollowCountView(APIView):
    """Return the follower count for an artist."""

    def get(self, request, artist_id: int) -> Response:
        artist = get_object_or_404(Artist, id=artist_id)
        return Response({"followers_count": Follow.objects.filter(artist=artist).count()})


class UserFollowingCountView(APIView):
    """Return how many artists the current user follows."""

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        return Response({"following_count": Follow.objects.filter(user=request.user).count()})


# ---------------------------------------------------------------------------
# Artist dashboard stats
# ---------------------------------------------------------------------------

class ArtistTrackCountView(APIView):
    """Total track count for the authenticated artist."""

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        artist = Artist.objects.filter(user=request.user).first()
        if not artist:
            return Response({"error": "Artist Profile not Found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"total_tracks": artist.musical_works.count()})


class ArtistAlbumCountView(APIView):
    """Total album count for the authenticated artist."""

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        artist = Artist.objects.filter(user=request.user).first()
        if not artist:
            return Response({"error": "Artist Profile not Found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"total_albums": artist.albums.count()})


class ArtistTotalPlaysView(APIView):
    """Total play count for the authenticated artist."""

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        artist = Artist.objects.filter(user=request.user).first()
        if not artist:
            return Response({"error": "Artist Profile not Found"}, status=status.HTTP_404_NOT_FOUND)

        play_count = ArtistPlayCount.objects.filter(artist=artist).first()
        total = play_count.total_plays if play_count else 0
        return Response({"total_plays": total})


class ArtistListenersView(APIView):
    """Unique listener count for the authenticated artist this month."""

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        artist = Artist.objects.filter(user=request.user).first()
        if not artist:
            return Response({"error": "Artist Profile not Found"}, status=status.HTTP_404_NOT_FOUND)

        first_of_month = timezone.now().date().replace(day=1)
        listeners = (
            ArtistActivity.objects.filter(
                artist=artist, last_played__date__gte=first_of_month,
            )
            .exclude(user=artist.user)
            .values("user")
            .distinct()
            .count()
        )
        return Response({"total_listeners": listeners})


class ArtistRecentPlaysView(APIView):
    """3 most recently played tracks by the authenticated artist."""

    permission_classes = [IsAuthenticated]

    def get(self, request, format=None) -> Response:
        artist = getattr(request.user, "artist_profile", None)
        if not artist:
            return Response({"recently_played": []})

        recent = (
            RecentlyPlayed.objects.filter(music__artist=artist)
            .select_related("music", "music__artist")
            .order_by("-last_played")[:3]
        )

        data = [
            {
                "music_id": rp.music.id,
                "name": rp.music.name,
                "cover_photo": rp.music.cover_photo.url if rp.music.cover_photo else None,
                "last_played": rp.last_played,
                "total_plays": getattr(rp.music.play_stats, "total_plays", 0),
            }
            for rp in recent
        ]
        return Response({"recently_played": data})


class HasAlbumsView(APIView):
    """Check whether the authenticated artist has any albums."""

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        has_albums = Album.objects.filter(artist__user=request.user).exists()
        return Response({"has_albums": has_albums})