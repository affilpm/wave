from django.db import models
from django.conf import settings
from django.utils import timezone
import razorpay

class PremiumPlan(models.Model):
    name = models.CharField(max_length=100)
    duration_days = models.PositiveIntegerField(help_text="Duration in days")
    duration_label = models.CharField(
        max_length=50, 
        help_text="Label for the duration (e.g., '1 Week', '3 Months')"
    )
    price = models.DecimalField(max_digits=6, decimal_places=2)
    description = models.TextField(blank=True)
    features = models.TextField(blank=True, help_text="Store features as pipe-separated values")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='created_plans'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    display_order = models.PositiveIntegerField(default=0, help_text="Order to display plans")
    
    def get_duration_days(self):
        """Return the plan duration in days"""
        return self.duration_days
    
    def __str__(self):
        return f"{self.name} ({self.duration_label})"
    
    class Meta:
        ordering = ['display_order', 'price']

class UserSubscription(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('pending', 'Pending'),
        ('cancelled', 'Cancelled')
    ]
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='subscription'
    )
    plan = models.ForeignKey(
        PremiumPlan, 
        on_delete=models.SET_NULL, 
        null=True
    )
    razorpay_subscription_id = models.CharField(
        max_length=255, 
        unique=True, 
        null=True, 
        blank=True
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending'
    )
    started_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    def is_active(self):
        if self.status == 'active' and self.expires_at and self.expires_at <= timezone.now():
            # Auto-expire
            self.status = 'expired'
            self.save(update_fields=['status'])
        return self.status == 'active'
            
    def renew_subscription(self, plan):
        """Renew or upgrade subscription"""
        self.plan = plan
        self.status = 'active'
        self.started_at = timezone.now()
        self.expires_at = timezone.now() + timezone.timedelta(days=plan.get_duration_days())
        self.save()
    
    def __str__(self):
        return f"{self.user.email} - {self.plan.name if self.plan else 'No Plan'}"

class RazorpayTransaction(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='transactions'
    )
    razorpay_payment_id = models.CharField(max_length=255)
    razorpay_order_id = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20)
    
    def __str__(self):
        return f"{self.user.email} - {self.razorpay_payment_id}"