from google.oauth2 import id_token
from google.auth.transport import requests
from rest_framework.decorators import api_view, permission_classes,authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer
from .models import CustomUser
from datetime import timedelta
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from datetime import timedelta
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from google.auth.transport.requests import Request
from google.oauth2 import id_token
from .models import CustomUser  # Ensure you import your custom user model
from .serializers import UserSerializer  # Ensure you import your user serializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings

@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    try:
        token = request.data.get('token')

        if not token:
            return Response({'message': 'Token required'}, status=400)

        # Verify the token with Google's API
        idinfo = id_token.verify_oauth2_token(
            token,
            Request(),
            settings.GOOGLE_CLIENT_ID
        )

        # Validate the issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            return Response({'message': 'Invalid issuer'}, status=400)

        email = idinfo['email']
        first_name = idinfo.get('given_name', '')
        last_name = idinfo.get('family_name', '')

        # Check if the user exists
        user = CustomUser.objects.filter(email=email).first()

        if user:
            # Update the user if necessary
            serializer = UserSerializer(user, data={'first_name': first_name, 'last_name': last_name}, partial=True)
            if serializer.is_valid():
                serializer.save()
        else:
            # Create a new user
            serializer = UserSerializer(data={'email': email, 'first_name': first_name, 'last_name': last_name})
            if serializer.is_valid():
                user = serializer.save()
            else:
                return Response(serializer.errors, status=400)

        # Create refresh token and access token
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token

        # Set access token lifetime (e.g., 1 hour)
        access_token.set_exp(lifetime=timedelta(hours=1))

        # Add custom claims to the access token
        access_token['email'] = user.email
        access_token['user_id'] = user.id
        access_token['first_name'] = user.first_name
        access_token['last_name'] = user.last_name

        # Return the tokens
        return Response({
            'tokens': {
                'access': str(access_token),
                'refresh': str(refresh)
            }
        })

    except Exception as e:
        # Log the error in production (using Django logging)
        print(f"Auth error: {str(e)}")  # You can replace this with proper logging in production
        return Response({'message': str(e)}, status=400)



@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def logout(request):
    try:
        refresh_token = request.data.get('refresh_token')
        
        if not refresh_token:
            return Response(
                {'error': 'Refresh token is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(
                {'message': 'Logout successful'}, 
                status=status.HTTP_200_OK
            )
        except TokenError as e:
            return Response(
                {'error': 'Invalid or expired token'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
        
        
        
        
        
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import UserSerializer
from django.core.exceptions import ValidationError
from .utils import send_otp_email, generate_otp

User = get_user_model()

class RegisterView(APIView):
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            # Generate OTP
            otp = generate_otp()
            # Save user with additional fields
            user = serializer.save(
                is_active=False,  # User won't be active until email is verified
                password=request.data.get('password')  # This will be hashed by the model
            )
            # Store OTP (you might want to use cache or a separate model)
            user.otp = otp
            user.save()
            
            # Send verification email
            try:
                send_otp_email(user.email, otp)
                return Response({
                    'message': 'Registration successful. Please check your email for verification.',
                    'user_id': user.id
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                user.delete()  # Rollback if email sending fails
                return Response({
                    'error': 'Failed to send verification email.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyEmailView(APIView):
    def post(self, request):
        user_id = request.data.get('user_id')
        otp = request.data.get('otp')

        try:
            user = User.objects.get(id=user_id)
            if str(user.otp) == str(otp):
                user.is_active = True
                user.otp = None  # Clear OTP after verification
                user.save()
                
                # Generate tokens
                refresh = RefreshToken.for_user(user)
                return Response({
                    'message': 'Email verified successfully',
                    'tokens': {
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    }
                })
            return Response({
                'error': 'Invalid OTP'
            }, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)

class LoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        try:
            user = User.objects.get(email=email)
            if not user.is_active:
                return Response({
                    'error': 'Please verify your email first.'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            if user.check_password(password):
                refresh = RefreshToken.for_user(user)
                return Response({
                    'tokens': {
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    },
                    'user': UserSerializer(user).data
                })
            else:
                return Response({
                    'error': 'Invalid credentials'
                }, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({
                'error': 'Invalid credentials'
            }, status=status.HTTP_400_BAD_REQUEST)        