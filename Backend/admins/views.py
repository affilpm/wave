from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from users.models import CustomUser
from artists.models import Artist
from rest_framework.permissions import IsAuthenticated
from .serializers import UserTableSerializer, UserStatusUpdateSerializer



#used for admin login
class AdminLoginView(TokenObtainPairView):


    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')

        user = authenticate(request, email=email, password=password)

        if user is not None and user.is_superuser:
            refresh = RefreshToken.for_user(user)

            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'isSuperuser': user.is_superuser,
                'isActive': user.is_active,  
            })
        else:
            return Response(
                {"detail": "Incorrect email or password"},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
            
            

#used to list users
User = CustomUser

class UserTableViewSet(viewsets.ModelViewSet):  # Changed from ReadOnlyModelViewSet
    queryset = User.objects.filter(is_superuser=False)
    serializer_class = UserTableSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'email']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return UserStatusUpdateSerializer
        return self.serializer_class


    @action(detail=False, methods=['get'])
    def stats(self, request):
        total_users = self.get_queryset().count()
        active_users = self.get_queryset().filter(is_active=True).count()
        artists = Artist.objects.filter(status='approved').count()

        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'artists': artists,
        })
