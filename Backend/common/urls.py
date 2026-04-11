from django.urls import path
from .views import placeholder_image

urlpatterns = [
    path('placeholder/<int:width>/<int:height>/', placeholder_image, name='placeholder_image'),
    path('placeholder/<int:width>/<int:height>', placeholder_image),
]
