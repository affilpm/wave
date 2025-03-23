from django.contrib import admin
from .models import PremiumPlan, UserSubscription, RazorpayTransaction

@admin.register(PremiumPlan)
class PremiumPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'duration_label', 'duration_days', 'price', 'is_active', 'display_order')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_by', 'created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'price', 'is_active', 'display_order')
        }),
        ('Duration Details', {
            'fields': ('duration_days', 'duration_label')
        }),
        ('Plan Details', {
            'fields': ('description', 'features')
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'status', 'started_at', 'expires_at')
    list_filter = ('status', 'started_at')
    search_fields = ('user__email', 'user__username')
    raw_id_fields = ('user', 'plan')

@admin.register(RazorpayTransaction)
class RazorpayTransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'razorpay_payment_id', 'amount', 'currency', 'timestamp', 'status')
    list_filter = ('status', 'timestamp', 'currency')
    search_fields = ('user__email', 'razorpay_payment_id', 'razorpay_order_id')
    raw_id_fields = ('user',)