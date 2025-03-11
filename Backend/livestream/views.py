from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import UserProfileSerializer

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    
    
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_livestream_token(request):
    """
    Generate a long-lived JWT token for livestreaming sessions.
    This token will have an extended expiration time (24 hours by default)
    but can be configured via the request body.
    """
    # Get user from request
    user = request.user
    
    # Get duration from request or use default (24 hours)
    hours = request.data.get('duration_hours', 24)
    
    try:
        # Convert to integer if it's a string
        hours = int(hours)
        
        # Limit maximum duration to 48 hours for security
        if hours > 48:
            hours = 48
            
        # Create payload with extended expiration
        payload = {
            'user_id': user.id,
            'username': user.username,
            'is_artist': hasattr(user, 'artist_profile'),
            'exp': datetime.now() + timedelta(hours=hours),
            'token_type': 'livestream'
        }
        
        # If user is an artist, add artist_id to payload
        if hasattr(user, 'artist_profile'):
            payload['artist_id'] = user.artist_profile.id
        
        # Generate token
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
        
        # Return token with expiration details
        return Response({
            'token': token,
            'expires_in': hours * 3600,  # seconds
            'token_type': 'livestream'
        })
        
    except ValueError:
        return Response(
            {'error': 'Invalid duration format'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'Token generation failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )    