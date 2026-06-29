"""
Admin API views — dashboard stats, user management, artist verification,
transaction management, and refunds.
"""

from __future__ import annotations

import datetime
import logging

from django.conf import settings
from django.contrib.auth import authenticate
from django.db import models
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.utils.timezone import now
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from admins.serializers import (
    RazorpayTransactionDetailSerializer,
    RazorpayTransactionSerializer,
    UserStatusUpdateSerializer,
    UserTableSerializer,
)
from artists.models import Artist, ArtistVerificationStatus, Follow
from artists.serializers import ArtistSerializer
from listening_history.models import MusicPlayCount
from music.models import Album, Genre, Music, MusicApprovalStatus
from playlist.models import Playlist
from premium.models import PremiumPlan, RazorpayTransaction, UserSubscription
from premium.services import PaymentService, SubscriptionService
from users.models import CustomUser

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

class AdminPagination(PageNumberPagination):
    """Shared pagination for admin views."""
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class TransactionPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "limit"
    max_page_size = 100


# ---------------------------------------------------------------------------
# Admin login
# ---------------------------------------------------------------------------

class AdminLoginView(TokenObtainPairView):
    """Authenticate admin users and return JWT tokens."""

    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        password = request.data.get("password")

        user = authenticate(request, email=email, password=password)

        if user is not None and user.is_superuser:
            refresh = RefreshToken.for_user(user)
            return Response({
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "isSuperuser": user.is_superuser,
                "isActive": user.is_active,
            })

        return Response(
            {"detail": "Incorrect email or password"},
            status=status.HTTP_401_UNAUTHORIZED,
        )


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

class UserTableViewSet(viewsets.ModelViewSet):
    """Admin CRUD for non-superuser accounts."""

    queryset = CustomUser.objects.filter(is_superuser=False)
    serializer_class = UserTableSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["email", "first_name", "last_name"]
    ordering_fields = ["created_at", "email"]
    ordering = ["-created_at"]
    pagination_class = AdminPagination

    def get_serializer_class(self):
        if self.action in ("update", "partial_update"):
            return UserStatusUpdateSerializer
        return self.serializer_class

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Return aggregate user + artist counts."""
        qs = self.get_queryset()
        return Response({
            "total_users": qs.count(),
            "active_users": qs.filter(is_active=True).count(),
            "artists": Artist.objects.filter(
                status=ArtistVerificationStatus.APPROVED,
            ).count(),
        })


# ---------------------------------------------------------------------------
# Artist management (admin)
# ---------------------------------------------------------------------------

class ArtistViewSet(viewsets.ModelViewSet):
    """Admin CRUD for artist profiles."""

    permission_classes = [IsAdminUser]
    queryset = Artist.objects.select_related("user").prefetch_related("genres")
    serializer_class = ArtistSerializer
    pagination_class = AdminPagination

    @action(detail=False, methods=["get"])
    def list_artists(self, request):
        """List artists with pagination and inline genre names."""
        artists = self.get_queryset()
        page = self.paginate_queryset(artists)
        items = page if page is not None else artists

        data = [
            {
                "id": a.id,
                "email": a.user.email,
                "username": a.user.username,
                "bio": a.bio,
                "status": a.status,
                "genre": ", ".join(g.name for g in a.genres.all()),
                "submitted_at": a.submitted_at,
            }
            for a in items
        ]
        if page is not None:
            return self.get_paginated_response(data)
        return Response({"count": len(data), "next": None, "previous": None, "results": data})

    @action(detail=True, methods=["post"])
    def update_status(self, request, pk=None):
        """Update an artist's verification status."""
        try:
            artist = Artist.objects.get(pk=pk)
        except Artist.DoesNotExist:
            return Response({"error": "Artist not found"}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status")
        if not new_status:
            return Response({"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST)
        if new_status not in ArtistVerificationStatus.values:
            return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        artist.status = new_status
        artist.save(update_fields=["status", "updated_at"])
        return Response({"status": artist.status})


# ---------------------------------------------------------------------------
# Transaction management
# ---------------------------------------------------------------------------

class AdminTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin read-only viewset for Razorpay transactions + refund action."""

    queryset = RazorpayTransaction.objects.select_related("user").order_by("-timestamp")
    serializer_class = RazorpayTransactionSerializer
    permission_classes = [IsAdminUser]
    pagination_class = TransactionPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status"]
    search_fields = ["user__email", "razorpay_payment_id", "razorpay_order_id"]
    ordering_fields = ["timestamp", "amount", "status"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return RazorpayTransactionDetailSerializer
        return RazorpayTransactionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(user__email__icontains=search)
                | Q(razorpay_payment_id__icontains=search)
                | Q(razorpay_order_id__icontains=search)
            )
        return qs

    @action(detail=True, methods=["post"])
    def refund(self, request, pk=None):
        """Process a refund via the PaymentService."""
        txn = self.get_object()
        success, message, refund_id = PaymentService.process_refund(txn, request.user.email)

        if not success:
            return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)

        # Expire the user's subscription after refund
        try:
            sub = UserSubscription.objects.get(user=txn.user)
            SubscriptionService.expire_subscription(sub)
        except UserSubscription.DoesNotExist:
            pass

        return Response({"detail": message, "refund_id": refund_id})


# ---------------------------------------------------------------------------
# Unified Dashboard Stats (single endpoint for Dashboard UI)
# ---------------------------------------------------------------------------

class AdminDashboardStatsView(APIView):
    """
    Unified dashboard endpoint — returns all metrics, charts, leaderboards,
    and recent activity in a single response to power the admin dashboard.
    """

    permission_classes = [IsAdminUser]

    # -- helpers ----

    @staticmethod
    def _month_range(dt):
        """Return (start, end) datetimes for the month containing *dt*."""
        start = dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if start.month == 12:
            end = start.replace(year=start.year + 1, month=1) - timezone.timedelta(seconds=1)
        else:
            end = start.replace(month=start.month + 1) - timezone.timedelta(seconds=1)
        return start, end

    @staticmethod
    def _successful_revenue_qs():
        return RazorpayTransaction.objects.filter(
            status__in=["captured", "authorized"],
        ).exclude(status="refunded")

    # -- main ----

    def get(self, request) -> Response:
        right_now = timezone.now()
        today = right_now.date()
        month_start, month_end = self._month_range(right_now)

        # Previous month range
        prev_month_dt = (month_start - timezone.timedelta(days=1))
        prev_start, prev_end = self._month_range(prev_month_dt)

        # ── KPI stats ──────────────────────────────────────────────
        total_users = CustomUser.objects.filter(is_superuser=False).count()
        active_premium = UserSubscription.objects.filter(
            status="active", expires_at__gt=right_now,
        ).count()
        total_artists = Artist.objects.filter(
            status=ArtistVerificationStatus.APPROVED,
        ).count()
        total_tracks = Music.objects.filter(
            approval_status=MusicApprovalStatus.APPROVED,
        ).count()
        total_albums = Album.objects.count()
        total_playlists = Playlist.objects.filter(is_system_created=False).count()
        total_streams = MusicPlayCount.objects.aggregate(
            total=Sum("total_plays"),
        )["total"] or 0

        monthly_revenue = float(
            self._successful_revenue_qs().filter(
                timestamp__gte=month_start, timestamp__lte=month_end,
            ).aggregate(total=Sum("amount"))["total"] or 0
        )
        prev_month_revenue = float(
            self._successful_revenue_qs().filter(
                timestamp__gte=prev_start, timestamp__lte=prev_end,
            ).aggregate(total=Sum("amount"))["total"] or 0
        )

        # ── Pending actions ────────────────────────────────────────
        pending_artists = Artist.objects.filter(
            status=ArtistVerificationStatus.PENDING,
        ).count()
        pending_music = Music.objects.filter(
            approval_status=MusicApprovalStatus.PENDING,
        ).count()

        # ── Revenue trend (6 months) ──────────────────────────────
        revenue_trend = []
        cursor = right_now
        for _ in range(6):
            ms, me = self._month_range(cursor)
            rev = float(
                self._successful_revenue_qs().filter(
                    timestamp__gte=ms, timestamp__lte=me,
                ).aggregate(total=Sum("amount"))["total"] or 0
            )
            revenue_trend.append({
                "month": ms.strftime("%b %Y"),
                "revenue": rev,
            })
            cursor = ms - timezone.timedelta(days=1)
        revenue_trend.reverse()

        # ── User growth (6 months) ────────────────────────────────
        user_growth = []
        cursor = right_now
        for _ in range(6):
            ms, me = self._month_range(cursor)
            count = CustomUser.objects.filter(
                is_superuser=False,
                created_at__gte=ms,
                created_at__lte=me,
            ).count()
            user_growth.append({
                "month": ms.strftime("%b %Y"),
                "users": count,
            })
            cursor = ms - timezone.timedelta(days=1)
        user_growth.reverse()

        # ── Genre distribution ────────────────────────────────────
        genre_dist = list(
            Genre.objects.annotate(
                track_count=Count("musical_works"),
            ).filter(track_count__gt=0)
            .order_by("-track_count")
            .values("name", "track_count")[:10]
        )

        # ── Plan distribution ─────────────────────────────────────
        plan_dist = []
        for plan in PremiumPlan.objects.filter(is_active=True):
            sub_count = UserSubscription.objects.filter(
                plan=plan, status="active",
            ).count()
            plan_dist.append({
                "name": plan.name,
                "subscribers": sub_count,
                "price": float(plan.price),
            })

        # ── Top 5 songs ───────────────────────────────────────────
        top_songs_qs = MusicPlayCount.objects.select_related(
            "music", "music__artist__user",
        ).order_by("-total_plays")[:5]
        top_songs = [
            {
                "name": p.music.name,
                "play_count": p.total_plays,
                "artist": p.music.artist.user.username,
            }
            for p in top_songs_qs
        ]

        # ── Top 5 artists ─────────────────────────────────────────
        top_artists = list(
            Artist.objects.filter(status=ArtistVerificationStatus.APPROVED)
            .annotate(follower_count=Count("followers"))
            .order_by("-follower_count")[:5]
            .values("id", "user__username", "follower_count")
        )

        # ── Recent activity ───────────────────────────────────────
        recent_txns = RazorpayTransactionSerializer(
            RazorpayTransaction.objects.select_related("user").order_by("-timestamp")[:5],
            many=True,
        ).data

        recent_signups = list(
            CustomUser.objects.filter(is_superuser=False)
            .order_by("-created_at")[:5]
            .values("id", "username", "email", "created_at")
        )

        recent_uploads_qs = (
            Music.objects.select_related("artist__user")
            .order_by("-created_at")[:5]
        )
        recent_uploads = [
            {
                "id": m.id,
                "name": m.name,
                "artist": m.artist.user.username,
                "status": m.approval_status,
                "created_at": m.created_at,
            }
            for m in recent_uploads_qs
        ]

        return Response({
            "stats": {
                "total_users": total_users,
                "active_premium": active_premium,
                "total_artists": total_artists,
                "total_tracks": total_tracks,
                "total_albums": total_albums,
                "total_playlists": total_playlists,
                "total_streams": total_streams,
                "monthly_revenue": monthly_revenue,
                "previous_month_revenue": prev_month_revenue,
            },
            "pending": {
                "artist_verifications": pending_artists,
                "music_approvals": pending_music,
            },
            "charts": {
                "revenue_trend": revenue_trend,
                "user_growth": user_growth,
                "genre_distribution": genre_dist,
                "plan_distribution": plan_dist,
            },
            "top_songs": top_songs,
            "top_artists": top_artists,
            "recent_activity": {
                "transactions": recent_txns,
                "signups": recent_signups,
                "uploads": recent_uploads,
            },
        })


# ---------------------------------------------------------------------------
# Dashboard statistics
# ---------------------------------------------------------------------------

class TransactionStatsView(APIView):
    """Aggregate transaction statistics for the admin dashboard."""

    permission_classes = [IsAdminUser]

    def get(self, request) -> Response:
        total = RazorpayTransaction.objects.count()
        successful = RazorpayTransaction.objects.filter(status__in=["captured", "authorized"]).count()
        refunded = RazorpayTransaction.objects.filter(status="refunded").count()
        failed = RazorpayTransaction.objects.filter(status="failed").count()

        revenue = (
            RazorpayTransaction.objects.filter(status__in=["captured", "authorized"])
            .exclude(status="refunded")
            .aggregate(total=Sum("amount"))["total"]
            or 0
        )

        recent = RazorpayTransaction.objects.order_by("-timestamp")[:5]
        plan_stats = [
            {
                "name": plan.get_name_display(),
                "subscriptions": UserSubscription.objects.filter(plan=plan).count(),
                "price": float(plan.price),
            }
            for plan in PremiumPlan.objects.all()
        ]

        return Response({
            "total_transactions": total,
            "successful_transactions": successful,
            "refunded_transactions": refunded,
            "failed_transactions": failed,
            "total_revenue": float(revenue),
            "recent_transactions": RazorpayTransactionSerializer(recent, many=True).data,
            "plan_stats": plan_stats,
        })


class TransactionMonthlyStatsView(APIView):
    """Monthly transaction and revenue breakdown (last 6 months)."""

    permission_classes = [IsAdminUser]

    def get(self, request) -> Response:
        end_date = timezone.now()
        start_date = end_date - timezone.timedelta(days=180)

        monthly_data = []
        current = start_date

        while current <= end_date:
            month_start = timezone.datetime(current.year, current.month, 1, tzinfo=timezone.utc)
            if current.month == 12:
                month_end = timezone.datetime(current.year + 1, 1, 1, tzinfo=timezone.utc) - timezone.timedelta(seconds=1)
            else:
                month_end = timezone.datetime(current.year, current.month + 1, 1, tzinfo=timezone.utc) - timezone.timedelta(seconds=1)

            txns = RazorpayTransaction.objects.filter(
                timestamp__gte=month_start, timestamp__lte=month_end,
            )
            revenue = (
                txns.filter(status__in=["captured", "authorized"])
                .exclude(status="refunded")
                .aggregate(total=Sum("amount"))["total"]
                or 0
            )
            monthly_data.append({
                "month": month_start.strftime("%b %Y"),
                "transactions": txns.count(),
                "revenue": float(revenue),
            })

            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)

        return Response(monthly_data)


# ---------------------------------------------------------------------------
# Simple stat endpoints
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAdminUser])
def total_users(request) -> Response:
    """Total registered user count."""
    return Response({"total_users": CustomUser.objects.count()})


@api_view(["GET"])
@permission_classes([IsAdminUser])
def total_premium_users(request) -> Response:
    """Active premium subscriber count."""
    count = UserSubscription.objects.filter(status="active").count()
    return Response({"total_premium_users": count})


@api_view(["GET"])
@permission_classes([IsAdminUser])
def total_premium_users_and_revenue(request) -> Response:
    """Current month premium subscribers and revenue."""
    today = now().date()
    start_of_month = today.replace(day=1)
    end_of_month = (start_of_month + datetime.timedelta(days=32)).replace(day=1) - datetime.timedelta(days=1)

    revenue = (
        RazorpayTransaction.objects.filter(
            timestamp__date__gte=start_of_month,
            timestamp__date__lte=end_of_month,
            status="success",
        ).aggregate(total=Sum("amount"))["total"]
        or 0.0
    )
    active_count = UserSubscription.objects.filter(
        status="active", expires_at__gt=now(),
    ).count()

    return Response({
        "month": today.strftime("%B %Y"),
        "start_date": start_of_month.isoformat(),
        "end_date": end_of_month.isoformat(),
        "total_premium_users": active_count,
        "total_revenue": revenue,
        "currency": "INR",
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def top_5_songs(request) -> Response:
    """Top 5 tracks by play count."""
    top = MusicPlayCount.objects.select_related(
        "music", "music__artist__user",
    ).order_by("-total_plays")[:5]

    data = [
        {
            "name": p.music.name,
            "play_count": p.total_plays,
            "artist": p.music.artist.user.username,
        }
        for p in top
    ]
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def top_5_artists(request) -> Response:
    """Top 5 artists by follower count."""
    top = (
        Artist.objects.annotate(follower_count=Count("followers"))
        .order_by("-follower_count")[:5]
        .values("id", "user__username", "bio", "follower_count")
    )
    return Response(top)