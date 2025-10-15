from django.db import transaction
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404
import razorpay
import uuid
import logging
from django_filters.rest_framework import DjangoFilterBackend
from .models import RazorpayTransaction, UserSubscription, PremiumPlan
from .serializers import RazorpayTransactionSerializer, UserSubscriptionSerializer, PremiumPlanSerializer
import csv
from django.http import HttpResponse
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action


logger = logging.getLogger(__name__)

class CreateRazorpayOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            client = razorpay.Client(
                auth=(settings.RAZOR_KEY_ID, settings.RAZOR_KEY_SECRET)
            )
            
            plan_id = request.data.get('plan_id')
            
            if not plan_id:
                return Response({
                    'error': 'Plan ID is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the plan from the database
            try:
                plan = PremiumPlan.objects.get(id=plan_id, is_active=True)
            except PremiumPlan.DoesNotExist:
                return Response({
                    'error': 'Invalid or inactive plan'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            amount = int(plan.price)
            
            ORDER_PARAMS = {
                'amount': amount * 100,  # Razorpay expects amount in paisa
                'currency': 'INR',
                'receipt': str(uuid.uuid4()),
                'notes': {
                    'user_id': str(request.user.id),
                    'plan_id': str(plan.id),
                    'duration_days': str(plan.duration_days)
                }
            }
            
            order = client.order.create(ORDER_PARAMS)
            
            return Response({
                'order_id': order['id'],
                'amount': amount,
                'key_id': settings.RAZOR_KEY_ID,
                'plan': {
                    'id': plan.id,
                    'name': plan.name,
                    'duration': plan.duration_label,
                    'price': str(plan.price)
                }
            })
        
        except Exception as e:
            logger.error(f"Error creating order: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyPaymentView(APIView):
    permission_classes = [IsAuthenticated]
    
    @transaction.atomic
    def post(self, request):
        try:
            # Verify payment with Razorpay
            razorpay_client = razorpay.Client(auth=(settings.RAZOR_KEY_ID, settings.RAZOR_KEY_SECRET))
            
            # Fetch payment data
            payment_id = request.data.get('payment_id')
            order_id = request.data.get('order_id')
            signature = request.data.get('signature')
            
            if not all([payment_id, order_id, signature]):
                return Response({
                    'status': 'failed', 
                    'error': 'Missing payment details'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify signature
            params_dict = {
                'razorpay_payment_id': payment_id,
                'razorpay_order_id': order_id,
                'razorpay_signature': signature
            }
            
            try:
                razorpay_client.utility.verify_payment_signature(params_dict)
            except Exception as e:
                logger.error(f"Invalid payment signature: {str(e)}")
                return Response({
                    'status': 'failed', 
                    'error': 'Invalid payment signature'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Fetch payment
            payment = razorpay_client.payment.fetch(payment_id)
            
            # Check payment status
            if payment['status'] == 'captured':
                # Get plan ID from notes
                plan_id = payment['notes'].get('plan_id')
                plan = get_object_or_404(PremiumPlan, id=plan_id)
                
                # Create transaction record
                transaction = RazorpayTransaction.objects.create(
                    user=request.user,
                    razorpay_payment_id=payment_id,
                    razorpay_order_id=order_id,
                    amount=payment['amount'] / 100,  # Convert from paisa to rupees
                    currency=payment['currency'],
                    status='success'
                )
                
                # Create/Update user subscription
                subscription, _ = UserSubscription.objects.update_or_create(
                    user=request.user,
                    defaults={
                        'plan': plan,
                        'status': 'active',
                        'started_at': timezone.now(),
                        'expires_at': timezone.now() + timezone.timedelta(days=plan.duration_days)
                    }
                )
            
                return Response({
                    'status': 'success',
                    'subscription': UserSubscriptionSerializer(subscription).data
                }, status=status.HTTP_200_OK)
            
            return Response({
                'status': 'failed', 
                'error': 'Payment not captured'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            logger.error(f"Payment verification failed: {str(e)}")
            return Response({
                'status': 'failed', 
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class PremiumPlanViewSet(viewsets.ModelViewSet):
    """
    ViewSet for premium plans.
    Admin can create/update/delete, while regular users can only view.
    """
    serializer_class = PremiumPlanSerializer
    
    def get_queryset(self):
        """
        Only return active plans to regular users.
        Admins can see all plans.
        """
        if self.request.user.is_staff:
            return PremiumPlan.objects.all()
        return PremiumPlan.objects.filter(is_active=True)
    
    def get_permissions(self):
        """
        Allow only admins to create, update or delete plans.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class UserSubscriptionView(APIView):
    """
    API to fetch and manage user subscriptions.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            subscription = UserSubscription.objects.get(user=request.user)
            serializer = UserSubscriptionSerializer(subscription)
            return Response(serializer.data)
        except UserSubscription.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'You do not have an active subscription'
            }, status=status.HTTP_404_NOT_FOUND)

class CheckSubscriptionStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Check if the logged-in user has an active subscription.
        """
        try:
            subscription = UserSubscription.objects.get(user=request.user)
            if subscription.is_active():
                return Response({
                    "status": "success",
                    "is_active": True,
                    "message": "You have an active subscription.",
                    "plan": {
                        "name": subscription.plan.name,
                        "duration": subscription.plan.duration_label
                    },
                    "expires_at": subscription.expires_at,
                    "days_remaining": (subscription.expires_at - timezone.now()).days
                })
            else:
                return Response({
                    "status": "inactive",
                    "is_active": False,
                    "message": "Your subscription is inactive or expired.",
                })
        except UserSubscription.DoesNotExist:
            return Response({
                "status": "error",
                "is_active": False,
                "message": "You do not have a subscription.",
            })
            
            
class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing transaction history.
    """
    serializer_class = RazorpayTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'currency']
    search_fields = ['razorpay_payment_id', 'razorpay_order_id']
    ordering_fields = ['timestamp', 'amount']
    ordering = ['-timestamp']  # Default ordering is newest first

    def get_queryset(self):
        """
        This view returns a list of all transactions for the currently authenticated user.
        """
        return RazorpayTransaction.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """
        Export user's transaction history as a CSV file
        """
        transactions = self.get_queryset()
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="transaction_history_{timezone.now().strftime("%Y%m%d")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Date', 'Transaction ID', 'Order ID', 'Amount', 'Currency', 'Status'])
        
        for transaction in transactions:
            writer.writerow([
                transaction.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                transaction.razorpay_payment_id,
                transaction.razorpay_order_id,
                transaction.amount,
                transaction.currency,
                transaction.status
            ])
        
        return response
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get a summary of user's transaction history
        """
        transactions = self.get_queryset()
        total_spent = sum(float(t.amount) for t in transactions if t.status.lower() in ['success', 'completed'])
        transaction_count = transactions.count()
        
        # Get current subscription details
        try:
            subscription = UserSubscription.objects.get(user=request.user)
            subscription_data = UserSubscriptionSerializer(subscription).data
        except UserSubscription.DoesNotExist:
            subscription_data = None
        
        return Response({
            'total_transactions': transaction_count,
            'total_spent': total_spent,
            'current_subscription': subscription_data,
            'latest_transaction': RazorpayTransactionSerializer(transactions.first()).data if transaction_count > 0 else None,
        })            
        
     
