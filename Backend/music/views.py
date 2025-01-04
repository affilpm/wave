from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from .models import Genre
from .serializers import GenreSerializer

class GenreViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Genre.objects.all()
    serializer_class = GenreSerializer