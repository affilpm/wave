"""Admin app URL configuration."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from admins.views import (
    AdminDashboardStatsView,
    AdminLoginView,
    AdminTransactionViewSet,
    ArtistViewSet,
    TransactionMonthlyStatsView,
    TransactionStatsView,
    UserTableViewSet,
    top_5_artists,
    top_5_songs,
    total_premium_users,
    total_premium_users_and_revenue,
    total_users,
)

router = DefaultRouter()
router.register(r"user-table", UserTableViewSet)
router.register(r"transactions", AdminTransactionViewSet, basename="admin_transactions")

urlpatterns = [
    path("", include(router.urls)),
    path("list-artists/", ArtistViewSet.as_view({"get": "list_artists"}), name="list_artists"),
    path("<int:pk>/update-status/", ArtistViewSet.as_view({"post": "update_status"}), name="update_status"),
    path("dashboard-stats/", AdminDashboardStatsView.as_view(), name="dashboard_stats"),
    path("transaction-stats/", TransactionStatsView.as_view(), name="transaction_stats"),
    path("monthly-stats/", TransactionMonthlyStatsView.as_view(), name="monthly_stats"),
    path("login/", AdminLoginView.as_view(), name="admin_login"),
    path("total-users/", total_users, name="total_users"),
    path("total-premium-users/", total_premium_users, name="total_premium_users"),
    path("premium-stats/", total_premium_users_and_revenue, name="stats"),
    path("top-songs/", top_5_songs, name="top_songs"),
    path("top-artists/", top_5_artists, name="top_artists"),
]