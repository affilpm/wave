from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
import razorpay
from .models import PremiumPlan  , RazorpayTransaction, razorpay, UserSubscription # Import from models
import uuid
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from django.shortcuts import get_object_or_404
from .models import PremiumPlan, UserSubscription, RazorpayTransaction
from .serializers import PremiumPlanSerializer, UserSubscriptionSerializer, RazorpayTransactionSerializer
from django.utils.timezone import now
logger = logging.getLogger(__name__)



class CreateRazorpayOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            client = razorpay.Client(
                auth=(settings.RAZOR_KEY_ID, settings.RAZOR_KEY_SECRET)
            )
            
            plan_name = request.data.get('plan')
            price_map = {
                'Individual': 1099,  
                'Duo': 1499,         
                'Family': 1599       
            }
            
            amount = price_map.get(plan_name, 1099)  
            
            ORDER_PARAMS = {
                'amount': amount * 100,  
                'currency': 'INR',
                'receipt': str(uuid.uuid4()),
                'notes': {
                    'user_id': str(request.user.id),
                    'plan': plan_name
                }
            }
            
            order = client.order.create(ORDER_PARAMS)
            
            return Response({
                'order_id': order['id'],
                'amount': amount,
                'key_id': settings.RAZOR_KEY_ID
            })
        
        except Exception as e:
            logger.error(f"Error creating order: {str(e)}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from django.db import transaction

class VerifyPaymentView(APIView):
    @transaction.atomic
    def post(self, request):
        try:
            # Verify payment with Razorpay first
            razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            
            # Fetch and verify payment
            payment = razorpay_client.payment.fetch(request.data['payment_id'])
            
            # Check payment status
            if payment['status'] == 'captured':
                # Create transaction record
                transaction = RazorpayTransaction.objects.create(
                    user=request.user,
                    razorpay_payment_id=payment['id'],
                    razorpay_order_id=payment['order_id'],
                    amount=payment['amount'] / 100,
                    status='success'
                )
                
                # Get or create plan
                plan, created = PremiumPlan.objects.get_or_create(
                    name=payment['notes']['plan'].lower(),
                    defaults={
                        'price': payment['amount'] / 100,
                        'max_users': 1 if payment['notes']['plan'] == 'Individual' else 
                                    2 if payment['notes']['plan'] == 'Duo' else 6
                    }
                )
                
                # Create/Update user subscription
                subscription, _ = UserSubscription.objects.update_or_create(
                    user=request.user,
                    defaults={
                        'plan': plan,
                        'status': 'active',
                        'started_at': timezone.now(),
                        'expires_at': timezone.now() + timezone.timedelta(days=30)
                    }
                )
            
                return Response({'status': 'success'}, status=status.HTTP_200_OK)
            
            return Response({'status': 'failed', 'error': 'Payment not captured'}, status=status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            logger.error(f"Payment verification failed: {str(e)}")
            return Response({'status': 'failed', 'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        




class PremiumPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing premium plans.
    """
    queryset = PremiumPlan.objects.all()
    serializer_class = PremiumPlanSerializer

class UserSubscriptionView(APIView):
    """
    API to fetch and manage user subscriptions.
    """

    def get(self, request):
        subscription = get_object_or_404(UserSubscription, user=request.user)
        serializer = UserSubscriptionSerializer(subscription)
        return Response(serializer.data)

    def post(self, request):
        plan_id = request.data.get('plan_id')
        plan = get_object_or_404(PremiumPlan, id=plan_id)

        subscription, created = UserSubscription.objects.get_or_create(user=request.user)
        subscription.renew_subscription(plan)
        serializer = UserSubscriptionSerializer(subscription)
        return Response(serializer.data, status=status.HTTP_200_OK)

class RazorpayTransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Razorpay transactions.
    """
    queryset = RazorpayTransaction.objects.all()
    serializer_class = RazorpayTransactionSerializer

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)
    
    
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import UserSubscription

class CheckSubscriptionStatusViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """
        Check if the logged-in user is subscribed.
        """
        try:
            subscription = request.user.subscription
            if subscription.is_active():
                return Response({
                    "status": "success",
                    "message": "You are subscribed.",
                    "plan": subscription.plan.name if subscription.plan else "No Plan",
                    "expires_at": subscription.expires_at
                })
            else:
                return Response({
                    "status": "inactive",
                    "message": "Your subscription is inactive or expired.",
                })
        except UserSubscription.DoesNotExist:
            return Response({
                "status": "error",
                "message": "You do not have a subscription."
            }, status=404)