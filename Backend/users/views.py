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
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.core.cache import cache
from .models import CustomUser
from .serializers import UserSerializer, LoginSerializer
from .utils import generate_otp, send_otp_email


from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.cache import cache
from datetime import timedelta
from .models import CustomUser
from .serializers import UserSerializer
from .utils import generate_otp, send_otp_email
from django.core.validators import validate_email
from django.core.exceptions import ValidationError


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Handle user login and OTP generation"""
    try:
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'message': 'Email is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user exists
        user = CustomUser.objects.filter(email=email).first()
        if not user:
            return Response(
                {'message': 'No account found with this email'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Generate and store OTP
        otp = generate_otp()
        cache_key = f'login_otp_{email}'
        cache.set(cache_key, otp, timeout=300)  # 5 minutes expiry
        
        # Send OTP
        try:
            send_otp_email(email, otp)
            return Response(
                {'message': 'OTP sent successfully'}, 
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'message': 'Failed to send OTP'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    except Exception as e:
        return Response(
            {'message': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )




@api_view(['POST'])
@permission_classes([AllowAny])
def login_verify_otp(request):
    """Verify OTP and generate tokens"""
    try:
        email = request.data.get('email')
        submitted_otp = str(request.data.get('otp'))  # Convert to string
        print(f"Received verify request - Email: {email}, OTP: {submitted_otp}")
        print(f"OTP type: {type(submitted_otp)}")

        # Check cache for stored OTP
        cache_key = f'login_otp_{email}'
        stored_otp = str(cache.get(cache_key))  # Convert to string
        print(f"Stored OTP from cache: {stored_otp}")
        print(f"Stored OTP type: {type(stored_otp)}")
        
        # Print ASCII values for debugging
        print(f"Submitted OTP ASCII: {[ord(c) for c in submitted_otp]}")
        print(f"Stored OTP ASCII: {[ord(c) for c in stored_otp]}")
        
        if not stored_otp:
            return Response(
                {'error': 'OTP has expired or does not exist'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Strip any whitespace
        submitted_otp = submitted_otp.strip()
        stored_otp = stored_otp.strip()
        
        if submitted_otp != stored_otp:
            print(f"OTP mismatch - Submitted: '{submitted_otp}', Stored: '{stored_otp}'")
            print(f"Length - Submitted: {len(submitted_otp)}, Stored: {len(stored_otp)}")
            return Response(
                {'error': 'Invalid OTP'}, 
                status=status.HTTP_400_BAD_REQUEST
            )


        # Get user and generate tokens
        try:
            user = CustomUser.objects.get(email=email)
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            # Add custom claims
            access_token['email'] = user.email
            access_token['user_id'] = user.id
            access_token['first_name'] = user.first_name
            access_token['last_name'] = user.last_name

            # Clear OTP from cache after successful verification
            cache.delete(cache_key)

            return Response({
                'tokens': {
                    'access': str(access_token),
                    'refresh': str(refresh)
                },
                'user': UserSerializer(user).data
            })

        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    except Exception as e:
        print(f"Error in verify_otp: {str(e)}")
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )



@api_view(['POST'])
@permission_classes([AllowAny])
def login_resend_otp(request):
    """Resend OTP"""
    print("Resend OTP request data:", request.data)  # Add this
    try:
        email = request.data.get('email')
        print("Email from request:", email)  # Add this
        
        if not email:
            return Response(
                {'message': 'Email is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate email format
        try:
            validate_email(email)
        except ValidationError:
            return Response(
                {'message': 'Invalid email format', 'field': 'email'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check cooldown period
        cache_key_cooldown = f'resend_cooldown_{email}'
        if cache.get(cache_key_cooldown):
            return Response(
                {'message': 'Please wait 60 seconds before requesting another OTP', 'field': 'email'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Check if user exists
        user = CustomUser.objects.filter(email=email).first()
        if not user:
            return Response(
                {'message': 'No account found with this email', 'field': 'email'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Generate new OTP
        otp = generate_otp()
        cache_key = f'login_otp_{email}'
        cache.set(cache_key, otp, timeout=300)  # 5 minutes expiry
        
        # Set cooldown
        cache.set(cache_key_cooldown, True, timeout=60)  # 60 seconds cooldown
        
        # Send new OTP
        try:
            send_otp_email(email, otp)
            return Response(
                {'message': 'OTP resent successfully'}, 
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'message': 'Failed to send OTP', 'field': 'email'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    except Exception as e:
        return Response(
            {'message': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


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
        
        
        
        
        


@api_view(['POST'])
@permission_classes([AllowAny])
def initiate_registration(request):
    """First step: Email submission and OTP generation"""
    email = request.data.get('email')
    
    if not email:
        return Response(
            {'error': 'Email is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if email already exists
    if CustomUser.objects.filter(email=email).exists():
        return Response(
            {'error': 'Email already registered'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Generate and store OTP
    otp = generate_otp()
    cache_key = f'registration_otp_{email}'
    cache.set(cache_key, str(otp), timeout=300)  # 5 minutes expiry
    
    try:
        send_otp_email(email, otp)
        return Response(
            {'message': 'OTP sent successfully'}, 
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {'error': 'Failed to send OTP'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """Second step: OTP verification"""
    email = request.data.get('email')
    submitted_otp = request.data.get('otp')
    
    if not email or not submitted_otp:
        return Response(
            {'error': 'Email and OTP are required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    cache_key = f'registration_otp_{email}'
    stored_otp = cache.get(cache_key)
    
    if not stored_otp or stored_otp != submitted_otp:
        return Response(
            {'error': 'Invalid OTP'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # OTP verified, create verification token
    verification_token = generate_otp()  # Using same function for simplicity
    cache_key = f'verification_token_{email}'
    cache.set(cache_key, verification_token, timeout=600)  # 10 minutes expiry
    
    return Response({
        'message': 'OTP verified successfully',
        'verification_token': verification_token
    })
    
    
    
@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp(request):
    """Resend OTP endpoint"""
    email = request.data.get('email')
    
    if not email:
        return Response(
            {'error': 'Email is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if email exists in registration process
    if CustomUser.objects.filter(email=email).exists():
        return Response(
            {'error': 'Email already registered'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Generate new OTP
    otp = generate_otp()
    cache_key = f'registration_otp_{email}'
    cache.set(cache_key, str(otp), timeout=300)  # 5 minutes expiry
    
    try:
        send_otp_email(email, otp)
        return Response(
            {'message': 'OTP sent successfully'}, 
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {'error': 'Failed to send OTP'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        
            

@api_view(['POST'])
@permission_classes([AllowAny])
def complete_registration(request):
    """Final step: Complete registration with user details"""
    email = request.data.get('email')
    first_name = request.data.get('firstName')
    last_name = request.data.get('lastName')
    
    # Create user
    user_data = {
        'email': email,
        'first_name': first_name,
        'last_name': last_name,
    }
    
    # Verify OTP was sent and verified
    cache_key = f'registration_otp_{email}'
    if not cache.get(cache_key):
        return Response(
            {'error': 'OTP verification expired. Please start over.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = UserSerializer(data=user_data)
    if serializer.is_valid():
        user = serializer.save()
        # Clear the OTP cache after successful registration
        cache.delete(cache_key)
        return Response(
            serializer.data, 
            status=status.HTTP_201_CREATED
        )
    
    return Response(
        serializer.errors, 
        status=status.HTTP_400_BAD_REQUEST
    )
    

