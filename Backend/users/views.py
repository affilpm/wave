from google.oauth2 import id_token
from google.auth.transport import requests
from rest_framework.decorators import api_view, permission_classes,authentication_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer, UserProfileSerializer, PlaylistSerializer
from .models import CustomUser
from rest_framework import status
from rest_framework_simplejwt.exceptions import TokenError
from google.auth.transport.requests import Request
from django.core.cache import cache
from .utils import generate_otp, send_otp_email
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
import re
from django.db.models import Count, F
from playlist.models import Playlist
from rest_framework.parsers import MultiPartParser, FormParser



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

        # Check if user is active
        if not user.is_active:
            return Response(
                {'message': 'Your account has been deactivated. Please contact support for assistance.'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # Generate and store OTP
        otp = generate_otp()
        cache_key = f'login_otp_{email}'
        # Store OTP for only 30 seconds
        cache.set(cache_key, otp, timeout=30)  # 30 seconds expiry
        
        # Set initial cooldown for resend
        cache_key_cooldown = f'resend_cooldown_{email}'
        cache.set(cache_key_cooldown, True, timeout=30)  # 30 seconds cooldown
        
        # Send OTP
        try:
            send_otp_email(email, otp)
            return Response(
                {'message': 'OTP sent successfully', 'expiresIn': 30}, 
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
    """Verify OTP and generate tokens with grace period"""
    try:
        email = request.data.get('email')
        submitted_otp = str(request.data.get('otp'))  # Convert to string
        submitted_time = request.data.get('submitted_at')  # Timestamp when user submitted the OTP
        print(f"Received verify request - Email: {email}, OTP: {submitted_otp}")
        
        # Check cache for stored OTP
        cache_key = f'login_otp_{email}'
        stored_otp = cache.get(cache_key)
        
        # Check cache for last valid OTP (for grace period)
        grace_key = f'login_otp_grace_{email}'
        grace_data = cache.get(grace_key)
        
        if stored_otp is None and grace_data is None:
            return Response(
                {'error': 'OTP has expired. Please request a new OTP.', 'expired': True}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # If current OTP exists, use it, otherwise check grace period OTP
        if stored_otp is not None:
            valid_otp = str(stored_otp).strip()
            print(f"Using current OTP from cache: {valid_otp}")
        elif grace_data is not None:
            # Ensure grace_data is a tuple of (otp, expiry_time)
            if isinstance(grace_data, tuple) and len(grace_data) == 2:
                grace_otp, grace_expiry = grace_data
                
                # Convert submitted_time to float if it's a string
                if isinstance(submitted_time, str):
                    try:
                        submitted_time = float(submitted_time)
                    except (ValueError, TypeError):
                        submitted_time = None
                
                # Check if submission was made before grace period expired
                if submitted_time and submitted_time <= grace_expiry:
                    valid_otp = str(grace_otp).strip()
                    print(f"Using grace period OTP: {valid_otp}")
                else:
                    return Response(
                        {'error': 'OTP has expired. Please request a new OTP.', 'expired': True}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                return Response(
                    {'error': 'OTP has expired. Please request a new OTP.', 'expired': True}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                {'error': 'OTP has expired. Please request a new OTP.', 'expired': True}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Strip any whitespace from submitted OTP
        submitted_otp = submitted_otp.strip()
        
        if submitted_otp != valid_otp:
            print(f"OTP mismatch - Submitted: '{submitted_otp}', Valid: '{valid_otp}'")
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
            access_token['username'] = user.username
            access_token['user_id'] = user.id
            access_token['first_name'] = user.first_name
            access_token['last_name'] = user.last_name
            if user.profile_photo:
                request_url = request.build_absolute_uri(user.profile_photo.url)
                access_token['profile_photo'] = request_url
            else:
                access_token['profile_photo'] = None
                
            # Clear OTP from cache after successful verification
            cache.delete(cache_key)
            cache.delete(grace_key)

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
    """Resend OTP with rate limiting"""
    print("Resend OTP request data:", request.data)
    try:
        email = request.data.get('email')
        print("Email from request:", email)
        
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
            # Get remaining cooldown time
            ttl = cache.ttl(cache_key_cooldown)
            return Response(
                {
                    'message': f'Please wait {ttl} seconds before requesting another OTP', 
                    'field': 'email',
                    'cooldownRemaining': ttl
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Check if user exists
        user = CustomUser.objects.filter(email=email).first()
        if not user:
            return Response(
                {'message': 'No account found with this email', 'field': 'email'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Implement rate limiting
        rate_limit_key = f'otp_rate_limit_{email}'
        attempts = cache.get(rate_limit_key, 0)
        
        # Increase cooldown time based on number of attempts
        cooldown_time = min(60 * (2 ** min(attempts, 4)), 600)  # Max 10 minutes (600 seconds)
        
        # Generate new OTP
        otp = generate_otp()
        cache_key = f'login_otp_{email}'
        
        # Save the current OTP to grace period cache before replacing it
        grace_key = f'login_otp_grace_{email}'
        current_otp = cache.get(cache_key)
        if current_otp:
            # Store the OTP with the server timestamp for when it expires
            # This allows us to verify if the user submitted before expiry
            import time
            grace_expiry = time.time() + 30  # Current time + 30 seconds
            cache.set(grace_key, (current_otp, grace_expiry), timeout=5)  # 5 second grace period
        
        # Store the new OTP
        cache.set(cache_key, otp, timeout=30)  # 30 seconds expiry
        
        # Set cooldown and increment rate limit counter
        cache.set(cache_key_cooldown, True, timeout=cooldown_time)
        cache.set(rate_limit_key, attempts + 1, timeout=86400)  # 24 hours expiry for rate limit counter
        
        # Send new OTP
        try:
            send_otp_email(email, otp)
            return Response(
                {
                    'message': 'OTP resent successfully',
                    'expiresIn': 30,
                    'cooldownTime': cooldown_time
                }, 
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
            # Check if user is active
            if not user.is_active:
                return Response({
                    'message': 'Your account has been deactivated. Please contact support for assistance.'
                }, status=403)
                
            # Update the user if necessary
            serializer = UserSerializer(user, data={'first_name': first_name, 'last_name': last_name}, partial=True)
            if serializer.is_valid():
                serializer.save()
        else:

            return Response({"error": "Email not found. Please sign up to continue."}, status=status.HTTP_404_NOT_FOUND)

        # Create refresh token and access token
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token


        # Add custom claims to the access token
        access_token['email'] = user.email
        access_token['username'] = user.username
        access_token['user_id'] = user.id
        access_token['first_name'] = user.first_name
        access_token['last_name'] = user.last_name
        if user.profile_photo:
            request_url = request.build_absolute_uri(user.profile_photo.url)
            access_token['profile_photo'] = request_url
        else:
            access_token['profile_photo'] = None
        

        # Return the tokens
        return Response({
            'tokens': {
                'access': str(access_token),
                'refresh': str(refresh)
            }
        })

    except Exception as e:

        return Response({'message': str(e)}, status=400)


@api_view(['POST'])
@permission_classes([AllowAny])
def google_pre_register(request):
    try:
        token = request.data.get('token')

        if not token:
            return Response({'message': 'Token required'}, status=400)

        # Verify the token with Google's API
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
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
            # Check if the user is active
            if not user.is_active:
                return Response({
                    'message': 'Your account has been deactivated. Please contact support for assistance.'
                }, status=403)
            
            return Response({'requires_username': False}, status=200)
        else:
            # New user needs to select a username
            return Response({'requires_username': True}, status=200)

    except Exception as e:
        return Response({'message': str(e)}, status=400)
    
    

@api_view(['POST'])
@permission_classes([AllowAny])
def google_register(request):
    try:
        token = request.data.get('token')
        username = request.data.get('username')

        if not token:
            return Response({'message': 'Token required'}, status=400)
        
        if not username:
            return Response({'message': 'Username required'}, status=400)

        # Verify the token with Google's API
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )

        # Validate the issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            return Response({'message': 'Invalid issuer'}, status=400)

        email = idinfo['email']
        first_name = idinfo.get('given_name', '')
        last_name = idinfo.get('family_name', '')


        #check if username contain whitespace
        if " " in username or re.search(r"\s", username):
            return Response({'error': 'Username cannot contain spaces'}, status=400)
        
        
        # Check if username is unique
        if CustomUser.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=400)

        # Create a new user with the provided username
        user = CustomUser.objects.create_user(
            email=email,
            username=username,
            first_name=first_name,
            last_name=last_name,
            is_active=True
        )

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'User successfully registered',
        }, status=201)

    except Exception as e:
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
    
    # Set a shorter expiry for OTP (30 seconds)
    cache.set(cache_key, str(otp), timeout=30)
    
    # Add rate limiting for OTP generation
    rate_limit_key = f'otp_rate_limit_{email}'
    if cache.get(rate_limit_key):
        return Response(
            {'error': 'Please wait before requesting another OTP'}, 
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )
    
    # Set rate limit for 30 seconds
    cache.set(rate_limit_key, True, timeout=30)
    
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
            {'error': 'Invalid or expired OTP'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # OTP verified, create verification token with longer expiry (5 minutes)
    verification_token = generate_otp()
    cache_key = f'verification_token_{email}'
    cache.set(cache_key, verification_token, timeout=300)  # 5 minutes expiry
    
    # Set an extended flag to allow completion
    extended_key = f'registration_extended_{email}'
    cache.set(extended_key, True, timeout=300)  # 5 minutes to complete the form
    
    return Response({
        'message': 'OTP verified successfully',
        'verification_token': verification_token
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp(request):
    """Resend OTP endpoint with rate limiting"""
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
    
    # Rate limiting for resends
    rate_limit_key = f'otp_rate_limit_{email}'
    if cache.get(rate_limit_key):
        remaining_time = cache.ttl(rate_limit_key)
        return Response(
            {'error': f'Please wait {remaining_time} seconds before requesting another OTP'}, 
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )
    
    # Generate new OTP
    otp = generate_otp()
    cache_key = f'registration_otp_{email}'
    cache.set(cache_key, str(otp), timeout=30)  # 30 seconds expiry
    
    # Set rate limit for 30 seconds
    cache.set(rate_limit_key, True, timeout=30)
    
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
    username = request.data.get('username', '').strip()
    
    # More comprehensive username validation
    if not username:
        return Response({'error': 'Username is required'}, status=400)
    
    if " " in username or re.search(r"\s", username):
        return Response({'error': 'Username cannot contain spaces'}, status=400)
    
    # Optional: Add more username validation (e.g., length, allowed characters)
    if len(username) < 3 or len(username) > 30:
        return Response({'error': 'Username must be between 3 and 30 characters'}, status=400)
    
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return Response({'error': 'Username can only contain letters, numbers, and underscores'}, status=400)
    
    # Check if username is unique
    if CustomUser.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists'}, status=400)    
    
    # Create user
    user_data = {
        'email': email,
        'first_name': first_name,
        'last_name': last_name,
        'username': username,
    }
    
    # Check if extended registration period is still valid
    extended_key = f'registration_extended_{email}'
    if not cache.get(extended_key):
        return Response(
            {'error': 'Registration session expired. Please start over.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    serializer = UserSerializer(data=user_data)
    if serializer.is_valid():
        user = serializer.save()
        # Clear the registration cache after successful registration
        cache.delete(extended_key)
        cache.delete(f'verification_token_{email}')
        return Response(
            serializer.data, 
            status=status.HTTP_201_CREATED
        )
    
    return Response(
        serializer.errors, 
        status=status.HTTP_400_BAD_REQUEST
    )






@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """
    GET: Retrieves the current user's profile
    PATCH: Updates the current user's profile
    """
    user = request.user
    
    if request.method == 'GET':
        serializer = UserProfileSerializer(user)
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        serializer = UserProfileSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_playlists_view(request):
    """
    GET: Retrieves all playlists created by the current user
    """
    playlists = Playlist.objects.filter(created_by=request.user).annotate(
        tracks_count=Count('tracks')
    )
    serializer = PlaylistSerializer(playlists, many=True)
    return Response(serializer.data)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user(request):
    """Get current user data"""
    serializer = UserSerializer(request.user, context={'request': request})
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def update_user(request):
    """Update user profile"""
    user = request.user
    serializer = UserSerializer(
        user,
        data=request.data,
        partial=True,
        context={'request': request}
    )

    if serializer.is_valid():
        try:
            # Save the user instance
            serializer.save()
            print(serializer.data)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)