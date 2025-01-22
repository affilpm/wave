# # signals.py
# from django.db.models.signals import post_save
# from django.dispatch import receiver
# from .models import Library
# from users.models import CustomUser

# @receiver(post_save, sender=CustomUser)
# def create_user_library(sender, instance, created, **kwargs):
#     if created:
#         Library.objects.create(user=instance)