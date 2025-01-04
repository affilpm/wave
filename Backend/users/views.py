from google.oauth2 import id_token
from google.auth.transport import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer
from .models import CustomUser

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