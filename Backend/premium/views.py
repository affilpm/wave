"""
Premium / payments API views — Razorpay integration, plans, subscriptions.
"""

from __future__ import annotations

import csv
import logging

from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

import razorpay

from premium.models import PremiumPlan, RazorpayTransaction, UserSubscription
from premium.serializers import PremiumPlanSerializer, RazorpayTransactionSerializer, UserSubscriptionSerializer

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Razorpay order creation
# ---------------------------------------------------------------------------

class CreateRazorpayOrderView(APIView):
    """Create a Razorpay order for a given premium plan."""

    permission_classes = [IsAuthenticated]

    def post(self, request) -> Response:
        plan_id = request.data.get("plan_id")
        if not plan_id:
            return Response({"error": "Plan ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = PremiumPlan.objects.get(id=plan_id, is_active=True)
        except PremiumPlan.DoesNotExist:
            return Response({"error": "Invalid or inactive plan"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client = razorpay.Client(auth=(settings.RAZOR_KEY_ID, settings.RAZOR_KEY_SECRET))
            amount = int(plan.price)

            order = client.order.create({
                "amount": amount * 100,
                "currency": "INR",
                "receipt": f"plan_{plan.id}_{request.user.id}",
                "notes": {
                    "user_id": str(request.user.id),
                    "plan_id": str(plan.id),
                    "duration_days": str(plan.duration_days),
                },
            })

            return Response({
                "order_id": order["id"],
                "amount": amount,
                "key_id": settings.RAZOR_KEY_ID,
                "plan": {
                    "id": plan.id,
                    "name": plan.name,
                    "duration": plan.duration_label,
                    "price": str(plan.price),
                },
            })

        except Exception as exc:
            logger.exception("Error creating Razorpay order")
            return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# Payment verification
# ---------------------------------------------------------------------------

class VerifyPaymentView(APIView):
    """Verify a Razorpay payment signature and activate the subscription."""

    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request) -> Response:
        payment_id = request.data.get("payment_id")
        order_id = request.data.get("order_id")
        signature = request.data.get("signature")

        if not all([payment_id, order_id, signature]):
            return Response(
                {"status": "failed", "error": "Missing payment details"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            client = razorpay.Client(auth=(settings.RAZOR_KEY_ID, settings.RAZOR_KEY_SECRET))

            # Verify signature
            try:
                client.utility.verify_payment_signature({
                    "razorpay_payment_id": payment_id,
                    "razorpay_order_id": order_id,
                    "razorpay_signature": signature,
                })
            except Exception:
                logger.warning("Invalid payment signature for order=%s", order_id)
                return Response(
                    {"status": "failed", "error": "Invalid payment signature"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Fetch payment details from Razorpay
            payment = client.payment.fetch(payment_id)

            if payment["status"] != "captured":
                return Response(
                    {"status": "failed", "error": "Payment not captured"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            plan_id = payment["notes"].get("plan_id")
            plan = get_object_or_404(PremiumPlan, id=plan_id)

            # Record the transaction
            RazorpayTransaction.objects.create(
                user=request.user,
                razorpay_payment_id=payment_id,
                razorpay_order_id=order_id,
                amount=payment["amount"] / 100,
                currency=payment["currency"],
                status="success",
            )

            # Activate subscription
            subscription, _ = UserSubscription.objects.update_or_create(
                user=request.user,
                defaults={
                    "plan": plan,
                    "status": "active",
                    "started_at": timezone.now(),
                    "expires_at": timezone.now() + timezone.timedelta(days=plan.duration_days),
                },
            )

            return Response({
                "status": "success",
                "subscription": UserSubscriptionSerializer(subscription).data,
            })

        except Exception as exc:
            logger.exception("Payment verification failed")
            return Response(
                {"status": "failed", "error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )


# ---------------------------------------------------------------------------
# Premium plans
# ---------------------------------------------------------------------------

class PremiumPlanViewSet(viewsets.ModelViewSet):
    """
    Premium plans — admins can CRUD, regular users can list active plans.
    """

    serializer_class = PremiumPlanSerializer

    def get_queryset(self):
        if self.request.user.is_staff:
            return PremiumPlan.objects.all()
        return PremiumPlan.objects.filter(is_active=True)

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ---------------------------------------------------------------------------
# Subscription views
# ---------------------------------------------------------------------------

class UserSubscriptionView(APIView):
    """Retrieve the authenticated user's subscription."""

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        try:
            sub = UserSubscription.objects.select_related("plan").get(user=request.user)
            return Response(UserSubscriptionSerializer(sub).data)
        except UserSubscription.DoesNotExist:
            return Response(
                {"status": "error", "message": "You do not have an active subscription"},
                status=status.HTTP_404_NOT_FOUND,
            )


class CheckSubscriptionStatusView(APIView):
    """Check whether the user has an active subscription with details."""

    permission_classes = [IsAuthenticated]

    def get(self, request) -> Response:
        try:
            sub = UserSubscription.objects.select_related("plan").get(user=request.user)
            if sub.is_active():
                return Response({
                    "status": "success",
                    "is_active": True,
                    "message": "You have an active subscription.",
                    "plan": {"name": sub.plan.name, "duration": sub.plan.duration_label},
                    "expires_at": sub.expires_at,
                    "days_remaining": (sub.expires_at - timezone.now()).days,
                })
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


# ---------------------------------------------------------------------------
# Transaction history
# ---------------------------------------------------------------------------

class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """User's own transaction history with CSV export and summary."""

    serializer_class = RazorpayTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "currency"]
    search_fields = ["razorpay_payment_id", "razorpay_order_id"]
    ordering_fields = ["timestamp", "amount"]
    ordering = ["-timestamp"]

    def get_queryset(self):
        return RazorpayTransaction.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"])
    def export_csv(self, request):
        """Export transaction history as a CSV download."""
        transactions = self.get_queryset()

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="transactions_{timezone.now().strftime("%Y%m%d")}.csv"'
        )

        writer = csv.writer(response)
        writer.writerow(["Date", "Transaction ID", "Order ID", "Amount", "Currency", "Status"])
        for txn in transactions:
            writer.writerow([
                txn.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                txn.razorpay_payment_id,
                txn.razorpay_order_id,
                txn.amount,
                txn.currency,
                txn.status,
            ])
        return response

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Transaction summary: total spent, count, current subscription."""
        transactions = self.get_queryset()
        total_spent = sum(
            float(t.amount) for t in transactions if t.status.lower() in ("success", "completed")
        )

        try:
            sub = UserSubscription.objects.select_related("plan").get(user=request.user)
            sub_data = UserSubscriptionSerializer(sub).data
        except UserSubscription.DoesNotExist:
            sub_data = None

        count = transactions.count()
        return Response({
            "total_transactions": count,
            "total_spent": total_spent,
            "current_subscription": sub_data,
            "latest_transaction": (
                RazorpayTransactionSerializer(transactions.first()).data if count > 0 else None
            ),
        })
