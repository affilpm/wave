from django.db.models.signals import post_save
from django.dispatch import receiver
from allauth.socialaccount.signals import social_account_added
from allauth.socialaccount.models import SocialAccount
from django.contrib.auth import get_user_model

@receiver(social_account_added)
def create_or_update_user_from_google(sender, request, sociallogin, **kwargs):
    user = sociallogin.user
    google_data = sociallogin.account.extra_data  # This contains the user's Google profile data

    # Check if the user has an email (Google should provide this)
    if user.email and not user.is_verified:
        user.is_verified = True  # Mark the user as verified after Google login
        user.save()

    # Update additional fields from Google data
    if google_data.get('birthday'):
        user.date_of_birth = google_data['birthday']
    if google_data.get('gender'):
        user.gender = google_data['gender']

    # Save the user data
    user.save()