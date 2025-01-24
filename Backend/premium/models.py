from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings
from django.utils import timezone
import razorpay

class PremiumPlan(models.Model):
    PLAN_CHOICES = [
        ('individual', 'Individual'),
        ('duo', 'Duo'),
        ('family', 'Family')
    ]
    
    name = models.CharField(
        max_length=20, 
        choices=PLAN_CHOICES, 
        unique=True
    )
    price = models.DecimalField(max_digits=6, decimal_places=2)
    max_users = models.IntegerField()
    description = models.TextField(blank=True)

    def __str__(self):
        return self.get_name_display()

class UserSubscription(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('pending', 'Pending')
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
        return (self.status == 'active' and 
                self.expires_at and 
                self.expires_at > timezone.now())

    def renew_subscription(self, plan):
        """
        Renew or upgrade subscription
        """
        self.plan = plan
        self.status = 'active'
        self.started_at = timezone.now()
        self.expires_at = timezone.now() + timezone.timedelta(days=30)
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