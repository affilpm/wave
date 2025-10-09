from django.urls import path, include
from . import views  
from .views import AdminLoginView 
from rest_framework.routers import DefaultRouter
from .views import UserTableViewSet, AdminTransactionViewSet, TransactionStatsView, total_users, top_5_songs, total_premium_users_and_revenue, top_5_artists

router = DefaultRouter()
router.register(r'user-table', UserTableViewSet)
router.register(r'transactions', AdminTransactionViewSet, basename='admin_transactions')

urlpatterns = [
    path('', include(router.urls)),
    path('list-artists/', views.ArtistViewSet.as_view({'get': 'list_artists'}), name='list_artists'),
    path('<int:pk>/update-status/', views.ArtistViewSet.as_view({'post': 'update_status'}), name='update_status'),
    path('transaction-stats/', TransactionStatsView.as_view(), name='transaction_stats'),
    path('login/', AdminLoginView.as_view(), name='admin_login'),
    path('total-users/', total_users, name='total_users'),
    path('premium-stats/', total_premium_users_and_revenue, name='stats'),
    path('top-songs/', top_5_songs, name='top_songs'),
    path('top-artists/', top_5_artists, name='top_artists'),

]
    
    