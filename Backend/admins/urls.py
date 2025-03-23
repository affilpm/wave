from django.urls import path, include
from . import views  # Correct import for views from the same app
from .views import AdminLoginView # or TokenObtainPairView if using the default
from rest_framework.routers import DefaultRouter
from .views import UserTableViewSet, AdminTransactionViewSet, TransactionStatsView, TransactionMonthlyStatsView, total_users, top_5_songs, total_premium_users_and_revenue, top_5_artists, ArtistViewSet, MusicVerificationViewSet

router = DefaultRouter()
router.register(r'user-table', UserTableViewSet)
router.register(r'transactions', AdminTransactionViewSet, basename='admin-transactions')
router.register(r'music-verification', MusicVerificationViewSet, basename='music-verification')


urlpatterns = [
    path('', include(router.urls)),
    path('list_artists/', views.ArtistViewSet.as_view({'get': 'list_artists'}), name='list_artists'),
    path('<int:pk>/update_status/', views.ArtistViewSet.as_view({'post': 'update_status'}), name='update_status'),
    path('transaction-stats/', TransactionStatsView.as_view(), name='transaction-stats'),
    # path('transaction-monthly-stats/', TransactionMonthlyStatsView.as_view(), name='transaction-monthly-stats'),         
    path('login/', AdminLoginView.as_view(), name='admin-login'),
    path('total-users/', total_users, name='total-users'),
    path('premium_stats/', total_premium_users_and_revenue, name='stats'),
    path('top-songs/', top_5_songs, name='top_songs'),
    path('top-artists/', top_5_artists, name='top_artists'),

]
    
    