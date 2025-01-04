# # users/forms.py
# from django import forms
# from django.contrib.auth.forms import AuthenticationForm
# from .models import CustomUser

# class CustomAdminAuthenticationForm(AuthenticationForm):
#     username = forms.CharField(label='Email', max_length=254)

#     def clean_username(self):
#         # Ensure the inputted username is an email and validate it
#         email = self.cleaned_data['username']
#         try:
#             user = CustomUser.objects.get(email=email)
#         except CustomUser.DoesNotExist:
#             raise forms.ValidationError('No user found with this email.')
#         return email