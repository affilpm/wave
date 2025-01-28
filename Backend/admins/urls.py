from django.urls import path, include
from . import views  # Correct import for views from the same app
from .views import AdminLoginView # or TokenObtainPairView if using the default
from rest_framework.routers import DefaultRouter
from .views import UserTableViewSet

router = DefaultRouter()
router.register(r'user-table', UserTableViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    path('login/', AdminLoginView.as_view(), name='admin-login'),

]
    
    