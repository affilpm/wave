# utils.py
from django.core.mail import send_mail
import random
import ssl
import certifi
from smtplib import SMTP_SSL
from django.core.mail import send_mail
from django.conf import settings

# def generate_otp():
#     return random.randint(100000, 999999)


# def send_otp_email(email, otp):
#     send_mail(
#         'Your OTP Code',  # Subject
#         f'Your OTP code is {otp}',  # Message body
#         'affilpm@gmail.com',  # Sender email
#         [email],  # Recipient email
#         fail_silently=False,
#     )
        
        


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