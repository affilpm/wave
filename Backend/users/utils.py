from django.core.mail import send_mail
import random
import ssl
import certifi
from smtplib import SMTP_SSL
from django.core.mail import send_mail
from django.conf import settings

def generate_otp():
    return random.randint(100000, 999999)


def send_otp_email(email, otp):
    subject = 'Your Login OTP'
    message = f'Your OTP for login is: {otp}. This OTP will expire in 30 seconds.'
    try:
        send_mail(
            subject,
            message,
            settings.EMAIL_HOST_USER,  # Sender email
            [email],  # Recipient email
            fail_silently=False,
        )
    except Exception as e:
        print(f"Error sending email: {e}")
        raise
        
        


def send_registration_email(first_name, last_name, email):
    """
    Utility function to send a registration email to the admin.
    """
    subject = 'New User Registration'
    message = f'User {first_name} {last_name} with email {email} has successfully registered.'
    from_email = settings.EMAIL_HOST_USER  # Sender email (configured in settings.py)
    recipient_list = ['admin@example.com']  # Admin email or recipient list

    try:
        send_mail(subject, message, from_email, recipient_list, fail_silently=False)
        print(f"Email sent to {', '.join(recipient_list)}")
    except Exception as e:
        print(f"Error sending email: {e}")