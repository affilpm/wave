from django.urls import path, include
from . import views  # Correct import for views from the same app
from .views import AdminLoginView # or TokenObtainPairView if using the default
from rest_framework.routers import DefaultRouter
from .views import UserTableViewSet, AdminTransactionViewSet, TransactionStatsView, TransactionMonthlyStatsView

router = DefaultRouter()
router.register(r'user-table', UserTableViewSet)
router.register(r'transactions', AdminTransactionViewSet, basename='admin-transactions')


urlpatterns = [
    path('', include(router.urls)),
    path('transaction-stats/', TransactionStatsView.as_view(), name='transaction-stats'),
    path('transaction-monthly-stats/', TransactionMonthlyStatsView.as_view(), name='transaction-monthly-stats'),         
    path('login/', AdminLoginView.as_view(), name='admin-login'),

]
    
    