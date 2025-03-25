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
from rest_framework.pagination import PageNumberPagination
from django.db import models
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Q
from django.conf import settings
import razorpay
from premium.models import RazorpayTransaction, UserSubscription, PremiumPlan
from .serializers import (
    RazorpayTransactionSerializer,
    RazorpayTransactionDetailSerializer
)
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from .serializers import RazorpayTransactionSerializer
import razorpay
import json
from django.utils import timezone
from premium.models import UserSubscription,  RazorpayTransaction
from django.utils.timezone import now, timedelta
from django.db.models import Count
from listening_history.models import PlaySession
from artists.serializers import ArtistSerializer
from artists.models import ArtistVerificationStatus
from music.serializers import MusicVerificationSerializer
from music.models import Music
from rest_framework.permissions import IsAdminUser


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



class Pagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100      
    
class UserTableViewSet(viewsets.ModelViewSet):  # Changed from ReadOnlyModelViewSet
    queryset = User.objects.filter(is_superuser=False)
    serializer_class = UserTableSerializer
    permission_classes = [IsAdminUser]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'email']
    ordering = ['-created_at']
    pagination_class = Pagination
    
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







    
# ViewSet for managing artists
class ArtistViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]

    queryset = Artist.objects.all()
    serializer_class = ArtistSerializer
    pagination_class = Pagination


    # Custom action for listing artists
    @action(detail=False, methods=['GET'])
    def list_artists(self, request):
        try:
            artists = Artist.objects.all()
            
            # Apply pagination
            page = self.paginate_queryset(artists)
            if page is not None:
                artist_data = [
                    {
                        'id': artist.id,
                        'email': artist.user.email,
                        'bio': artist.bio,
                        'status': artist.status,
                        'genre': ', '.join([genre.name for genre in artist.genres.all()]),
                        'submitted_at': artist.submitted_at
                    }
                    for artist in page
                ]
                return self.get_paginated_response(artist_data)  # ✅ Correct DRF pagination response
            
            # If pagination is not applied, return manually paginated response
            artist_data = [
                {
                    'id': artist.id,
                    'email': artist.user.email,
                    'bio': artist.bio,
                    'status': artist.status,
                    'genre': ', '.join([genre.name for genre in artist.genres.all()]),
                    'submitted_at': artist.submitted_at
                }
                for artist in artists
            ]

            return Response({
                'count': len(artist_data),  # ✅ Ensuring total count is sent
                'next': None,
                'previous': None,
                'results': artist_data  # ✅ Consistent response format
            }, status=200)
        
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    # Custom action for updating artist status
    @action(detail=True, methods=['POST'])
    def update_status(self, request, pk=None):
        try:
            artist = Artist.objects.get(pk=pk)
            new_status = request.data.get('status')

            if not new_status:
                return Response({'error': 'Status is required'}, status=400)

            if new_status not in [status for status in ArtistVerificationStatus.values]:
                return Response({'error': 'Invalid status'}, status=400)

            artist.status = new_status
            artist.save()
            return Response({'status': artist.status}, status=200)
        except Artist.DoesNotExist:
            return Response({'error': 'Artist not found'}, status=404)





    

# class MusicVerificationViewSet(viewsets.ModelViewSet):
#     serializer_class = MusicVerificationSerializer
#     permission_classes = [IsAdminUser]
    
#     def get_queryset(self):
#         return Music.objects.select_related(
#             'artist', 
#             'artist__user'
#         ).prefetch_related(
#             'genres'
#         ).order_by('-created_at')
    
#     def get_serializer_context(self):
#         context = super().get_serializer_context()
#         context['request'] = self.request
#         return context

#     @action(detail=True, methods=['post'])
#     def approve(self, request, pk=None):
#         try:
#             music = self.get_object()
#             music.approval_status = MusicApprovalStatus.APPROVED
#             # music.is_public = True
#             music.save()
            
#             # Re-serialize the updated object
#             serializer = self.get_serializer(music)
#             return Response(serializer.data)
#         except Exception as e:
#             return Response(
#                 {'error': str(e)},
#                 status=status.HTTP_400_BAD_REQUEST
#             )
    
#     @action(detail=True, methods=['post'])
#     def reject(self, request, pk=None):
#         try:
#             music = self.get_object()
#             music.approval_status = MusicApprovalStatus.REJECTED
#             music.save()
            
#             # Re-serialize the updated object
#             serializer = self.get_serializer(music)
#             return Response(serializer.data)
#         except Exception as e:
#             return Response(
#                 {'error': str(e)},
#                 status=status.HTTP_400_BAD_REQUEST
#             )

                    
                   
                   
                   

                   
                   


class TransactionPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'limit'
    max_page_size = 100

class AdminTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin API endpoint for managing transactions
    """
    queryset = RazorpayTransaction.objects.all().order_by('-timestamp')
    serializer_class = RazorpayTransactionSerializer
    permission_classes = [IsAdminUser]

    pagination_class = TransactionPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['user__email', 'razorpay_payment_id', 'razorpay_order_id']
    ordering_fields = ['timestamp', 'amount', 'status']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RazorpayTransactionDetailSerializer
        return RazorpayTransactionSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Additional filtering options
        status = self.request.query_params.get('status', None)
        search = self.request.query_params.get('search', None)
        
        if status:
            queryset = queryset.filter(status__iexact=status)
        
        if search:
            queryset = queryset.filter(
                Q(user__email__icontains=search) |
                Q(razorpay_payment_id__icontains=search) |
                Q(razorpay_order_id__icontains=search)
            )
            
        return queryset
    
    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        """
        Process a refund for a transaction
        """
        transaction = self.get_object()
        
        # Check if transaction is already refunded
        if transaction.status.lower() == 'refunded':
            return Response(
                {"detail": "Transaction has already been refunded."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if transaction is eligible for refund
        if transaction.status.lower() not in ['captured', 'authorized']:
            return Response(
                {"detail": "Only captured or authorized transactions can be refunded."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Initialize Razorpay client
        client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
        
        try:
            # Process refund through Razorpay
            refund_data = client.payment.refund(
                transaction.razorpay_payment_id, 
                {
                    "amount": int(float(transaction.amount) * 100),  # Convert to paise
                    "notes": {
                        "reason": "Admin requested refund",
                        "admin_email": request.user.email
                    }
                }
            )
            
            # Update transaction status
            transaction.status = 'refunded'
            transaction.save()
            
            # Check if this is associated with a subscription and update it
            try:
                subscription = UserSubscription.objects.get(user=transaction.user)
                if subscription.is_active():
                    subscription.status = 'expired'
                    subscription.save()
            except UserSubscription.DoesNotExist:
                pass
                
            return Response({
                "detail": "Refund processed successfully.",
                "refund_id": refund_data.get('id')
            })
            
        except Exception as e:
            return Response(
                {"detail": f"Refund failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
            
            


class TransactionStatsView(APIView):
    """
    Get statistics about transactions for admin dashboard
    """
    permission_classes = [IsAdminUser]

    
    def get(self, request):
        # Get statistics
        total_transactions = RazorpayTransaction.objects.count()
        successful_transactions = RazorpayTransaction.objects.filter(
            status__in=['captured', 'authorized']
        ).count()
        refunded_transactions = RazorpayTransaction.objects.filter(status='refunded').count()
        failed_transactions = RazorpayTransaction.objects.filter(status='failed').count()
        
        # Calculate total revenue
        total_revenue = RazorpayTransaction.objects.filter(
            status__in=['captured', 'authorized']
        ).exclude(status='refunded').aggregate(
            total=models.Sum('amount')
        )['total'] or 0
        
        # Get recent transactions
        recent_transactions = RazorpayTransaction.objects.all().order_by('-timestamp')[:5]
        recent_transactions_data = RazorpayTransactionSerializer(recent_transactions, many=True).data
        
        # Get statistics by plan
        plans = PremiumPlan.objects.all()
        plan_stats = []
        
        for plan in plans:
            plan_subscriptions = UserSubscription.objects.filter(plan=plan).count()
            plan_stats.append({
                'name': plan.get_name_display(),
                'subscriptions': plan_subscriptions,
                'price': float(plan.price)
            })
            
        return Response({
            'total_transactions': total_transactions,
            'successful_transactions': successful_transactions,
            'refunded_transactions': refunded_transactions,
            'failed_transactions': failed_transactions,
            'total_revenue': float(total_revenue),
            'recent_transactions': recent_transactions_data,
            'plan_stats': plan_stats
        })

class TransactionMonthlyStatsView(APIView):
    """
    Get monthly statistics for transactions
    """
    permission_classes = [IsAdminUser]

    
    def get(self, request):
        # Get statistics for the last 6 months
        end_date = timezone.now()
        start_date = end_date - timezone.timedelta(days=180)  # Approximately 6 months
        
        # Generate monthly data
        monthly_data = []
        current_date = start_date
        
        while current_date <= end_date:
            month_start = timezone.datetime(current_date.year, current_date.month, 1, tzinfo=timezone.utc)
            if current_date.month == 12:
                month_end = timezone.datetime(current_date.year + 1, 1, 1, tzinfo=timezone.utc) - timezone.timedelta(seconds=1)
            else:
                month_end = timezone.datetime(current_date.year, current_date.month + 1, 1, tzinfo=timezone.utc) - timezone.timedelta(seconds=1)
            
            # Count transactions for this month
            month_transactions = RazorpayTransaction.objects.filter(
                timestamp__gte=month_start,
                timestamp__lte=month_end
            )
            
            # Calculate revenue for this month
            month_revenue = month_transactions.filter(
                status__in=['captured', 'authorized']
            ).exclude(status='refunded').aggregate(
                total=models.Sum('amount')
            )['total'] or 0
            
            monthly_data.append({
                'month': month_start.strftime('%b %Y'),
                'transactions': month_transactions.count(),
                'revenue': float(month_revenue)
            })
            
            # Move to next month
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
        
        return Response(monthly_data)




@api_view(['GET'])
@permission_classes([IsAdminUser]) 
def total_users(request):
    count = CustomUser.objects.count()
    return Response({'total_users': count})



@api_view(['GET'])
@permission_classes([IsAdminUser]) 
def total_premium_users(request):
    count = UserSubscription.objects.filter(status='active').count()
    return Response({'total_premium_users': count})




from django.db.models import Sum, Count
from django.utils.timezone import now
import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([IsAdminUser]) 
def total_premium_users_and_revenue(request):
    today = now().date()
    start_of_month = today.replace(day=1)
    end_of_month = (start_of_month + datetime.timedelta(days=32)).replace(day=1) - datetime.timedelta(days=1)
    
    # Query to sum all transactions in the current month
    total_revenue = RazorpayTransaction.objects.filter(
        timestamp__date__gte=start_of_month,
        timestamp__date__lte=end_of_month,
        status="success"  # Filter only successful payments
    ).aggregate(total=Sum('amount'))['total'] or 0.0
    
    # Count active premium users in the current month
    active_users_count = UserSubscription.objects.filter(
        status='active',
        expires_at__gt=now()
    ).count()
    
    return Response({
        'month': today.strftime('%B %Y'),
        'start_date': start_of_month.strftime('%Y-%m-%d'),
        'end_date': end_of_month.strftime('%Y-%m-%d'),
        'total_premium_users': active_users_count,
        'total_revenue': total_revenue,
        'currency': 'INR'  # Assuming INR as default from your model
    })
    

@api_view(['GET'])
@permission_classes([IsAdminUser]) 
def top_5_songs(request):
    # Aggregate play counts from completed sessions
    top_songs = (
        PlaySession.objects.filter(status='completed')
        .values('music__id', 'music__name', 'music__artist__user__email')  # Fetch music details
        .annotate(play_count=Count('id'))  # Count completed plays
        .order_by('-play_count')[:5]  # Get top 5 songs
    )

    return Response(top_songs)    






@api_view(['GET'])
@permission_classes([IsAdminUser]) 
def top_5_artists(request):
    # Get top 5 artists based on follower count
    top_artists = (
        Artist.objects.annotate(follower_count=Count('followers'))
        .order_by('-follower_count')[:5]
        .values('id', 'user__email', 'bio', 'follower_count')  # Fetch artist details
    )

    return Response(top_artists)