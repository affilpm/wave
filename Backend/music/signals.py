from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Music, MusicApprovalStatus

@receiver(post_save, sender = Music)
def update_is_public(sender, instance, **kwargs):
    if instance.approval_status in [MusicApprovalStatus.PENDING, MusicApprovalStatus.REJECTED]:
        if instance.is_public:
            instance.is_public = False
            instance.save(update_fields = ['is_public'])