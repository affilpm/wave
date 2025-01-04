from django.urls import path
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GenreViewSet
from . import views
router = DefaultRouter()
router.register(r'genres', GenreViewSet, basename='genre')

urlpatterns = [
    path('genres/', GenreViewSet.as_view({'get': 'list'}), name='genre-list'),
]