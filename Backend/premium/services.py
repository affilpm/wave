"""
Premium / payments service layer — Razorpay integration and subscription logic.
"""

from __future__ import annotations

import logging
from decimal import Decimal

import razorpay
from django.conf import settings
from django.utils import timezone

from premium.models import (
    PremiumPlan,
    RazorpayTransaction,
    SubscriptionStatus,
    UserSubscription,
)
from users.models import CustomUser

logger = logging.getLogger(__name__)


class PaymentService:
    """Razorpay order creation, verification, and refunds."""

    @staticmethod
    def _get_client() -> razorpay.Client:
        """Return a configured Razorpay API client."""
        return razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

    @staticmethod
    def create_order(plan: PremiumPlan) -> dict:
        """
        Create a Razorpay order for the given plan.

        Returns:
            Razorpay order dict with ``id``, ``amount``, ``currency``, etc.
        """
        client = PaymentService._get_client()
        amount_paise = int(plan.price * 100)

        order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "notes": {"plan_id": str(plan.id), "plan_name": plan.name},
        })

        logger.info(
            "Razorpay order created: order_id=%s plan=%s amount=%s",
            order["id"], plan.name, amount_paise,
        )
        return order

    @staticmethod
    def verify_payment_signature(
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> bool:
        """Verify Razorpay payment signature to prevent tampering."""
        client = PaymentService._get_client()
        try:
            client.utility.verify_payment_signature({
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            })
            return True
        except razorpay.errors.SignatureVerificationError:
            logger.warning(
                "Signature verification failed for order=%s",
                razorpay_order_id,
            )
            return False

    @staticmethod
    def process_refund(
        transaction: RazorpayTransaction, admin_email: str
    ) -> tuple[bool, str, str | None]:
        """
        Issue a refund via Razorpay for the given transaction.

        Returns:
            (success, message, refund_id) tuple.
        """
        if transaction.status.lower() == "refunded":
            return False, "Transaction has already been refunded.", None

        if transaction.status.lower() not in ("captured", "authorized"):
            return False, "Only captured or authorized transactions can be refunded.", None

        client = PaymentService._get_client()
        try:
            refund = client.payment.refund(
                transaction.razorpay_payment_id,
                {
                    "amount": int(float(transaction.amount) * 100),
                    "notes": {
                        "reason": "Admin requested refund",
                        "admin_email": admin_email,
                    },
                },
            )

            transaction.status = "refunded"
            transaction.save(update_fields=["status"])

            logger.info(
                "Refund processed: transaction=%s refund_id=%s",
                transaction.id, refund.get("id"),
            )
            return True, "Refund processed successfully.", refund.get("id")

        except Exception as exc:
            logger.exception("Refund failed for transaction %s", transaction.id)
            return False, f"Refund failed: {exc}", None


class SubscriptionService:
    """Subscription lifecycle management."""

    @staticmethod
    def activate_subscription(
        user: CustomUser,
        plan: PremiumPlan,
        razorpay_payment_id: str,
        razorpay_order_id: str,
        amount: Decimal,
    ) -> UserSubscription:
        """
        Activate or renew a user's subscription after successful payment.

        Creates the transaction record and updates the subscription.
        """
        RazorpayTransaction.objects.create(
            user=user,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_order_id=razorpay_order_id,
            amount=amount,
            currency="INR",
            status="captured",
        )

        subscription, _ = UserSubscription.objects.get_or_create(user=user)
        subscription.plan = plan
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.started_at = timezone.now()
        subscription.expires_at = timezone.now() + timezone.timedelta(
            days=plan.get_duration_days()
        )
        subscription.save()

        logger.info(
            "Subscription activated: user=%s plan=%s expires=%s",
            user.email, plan.name, subscription.expires_at,
        )
        return subscription

    @staticmethod
    def expire_subscription(subscription: UserSubscription) -> None:
        """Mark a subscription as expired (called after refund)."""
        if subscription.is_active():
            subscription.status = SubscriptionStatus.EXPIRED
            subscription.save(update_fields=["status"])
            logger.info("Subscription expired for user=%s", subscription.user.email)

    @staticmethod
    def get_active_subscription(user: CustomUser) -> UserSubscription | None:
        """Return the user's active subscription, or None."""
        try:
            sub = UserSubscription.objects.select_related("plan").get(user=user)
            if sub.is_active():
                return sub
            return None
        except UserSubscription.DoesNotExist:
            return None
