from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import PremiumPlan, UserSubscription, RazorpayTransaction

class PremiumPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'max_users', 'description')
    search_fields = ('name',)
    list_filter = ('name',)

class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'status', 'started_at', 'expires_at')
    search_fields = ('user__email', 'plan__name', 'status')
    list_filter = ('status', 'plan')

class RazorpayTransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'razorpay_payment_id', 'razorpay_order_id', 'amount', 'status', 'timestamp')
    search_fields = ('razorpay_payment_id', 'razorpay_order_id', 'user__email')
    list_filter = ('status', 'currency')

# Register models with the admin site
admin.site.register(PremiumPlan, PremiumPlanAdmin)
admin.site.register(UserSubscription, UserSubscriptionAdmin)
admin.site.register(RazorpayTransaction, RazorpayTransactionAdmin)