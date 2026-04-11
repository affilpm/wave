"""
Premium subscription and payment models for the Wave platform.

Defines premium plans, user subscriptions, and Razorpay transaction
records for the monetisation layer.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class SubscriptionStatus(models.TextChoices):
    """Lifecycle states for a user subscription."""

    ACTIVE = "active", "Active"
    EXPIRED = "expired", "Expired"
    PENDING = "pending", "Pending"
    CANCELLED = "cancelled", "Cancelled"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class PremiumPlan(models.Model):
    """
    A purchasable subscription plan (e.g. Weekly, Monthly, Yearly).
    """

    name = models.CharField(max_length=100)
    duration_days = models.PositiveIntegerField(help_text="Duration in days.")
    duration_label = models.CharField(
        max_length=50,
        help_text="Human-readable label (e.g. '1 Week', '3 Months').",
    )
    price = models.DecimalField(max_digits=6, decimal_places=2)
    description = models.TextField(blank=True)
    features = models.TextField(
        blank=True,
        help_text="Pipe-separated feature list.",
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_plans",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    display_order = models.PositiveIntegerField(
        default=0,
        help_text="Order in which plans are shown to users.",
    )

    class Meta:
        verbose_name = "premium plan"
        verbose_name_plural = "premium plans"
        ordering = ["display_order", "price"]

    def __str__(self) -> str:
        return f"{self.name} ({self.duration_label})"

    def get_duration_days(self) -> int:
        """Return the plan duration in days."""
        return self.duration_days


class UserSubscription(models.Model):
    """
    Tracks a user's active premium subscription.

    Automatically expires when ``expires_at`` is in the past.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    plan = models.ForeignKey(
        PremiumPlan,
        on_delete=models.SET_NULL,
        null=True,
    )
    razorpay_subscription_id = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.PENDING,
    )
    started_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "subscription"
        verbose_name_plural = "subscriptions"

    def __str__(self) -> str:
        plan_name = self.plan.name if self.plan else "No Plan"
        return f"{self.user.email} - {plan_name}"

    def is_active(self) -> bool:
        """
        Check whether the subscription is currently active.

        Side-effect: auto-expires the subscription if ``expires_at`` has passed.
        """
        if (
            self.status == SubscriptionStatus.ACTIVE
            and self.expires_at
            and self.expires_at <= timezone.now()
        ):
            self.status = SubscriptionStatus.EXPIRED
            self.save(update_fields=["status"])
        return self.status == SubscriptionStatus.ACTIVE

    def renew_subscription(self, plan: PremiumPlan) -> None:
        """Renew or upgrade the subscription to the given *plan*."""
        self.plan = plan
        self.status = SubscriptionStatus.ACTIVE
        self.started_at = timezone.now()
        self.expires_at = timezone.now() + timezone.timedelta(
            days=plan.get_duration_days()
        )
        self.save()


class RazorpayTransaction(models.Model):
    """Individual payment transaction recorded from Razorpay callbacks."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    razorpay_payment_id = models.CharField(max_length=255)
    razorpay_order_id = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="INR")
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20)

    class Meta:
        verbose_name = "transaction"
        verbose_name_plural = "transactions"
        ordering = ["-timestamp"]

    def __str__(self) -> str:
        return f"{self.user.email} - {self.razorpay_payment_id}"