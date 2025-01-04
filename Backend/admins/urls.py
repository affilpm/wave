from django.urls import path
from . import views  # Correct import for views from the same app
from .views import AdminLoginView # or TokenObtainPairView if using the default

urlpatterns = [
    path('login/', AdminLoginView.as_view(), name='admin-login'),

]
    
    