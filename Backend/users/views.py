"""
User API views — thin controllers delegating to ``users.services``.
"""

from __future__ import annotations

import logging

from django.db.models import Count
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    parser_classes,
    permission_classes,
)
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from playlist.models import Playlist
from users.models import CustomUser
from users.serializers import PlaylistSerializer, UserProfileSerializer, UserSerializer
from users.services import AuthenticationService, UserService

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Login  (OTP flow)
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([AllowAny])
def login(request) -> Response:
    """Initiate login by sending an OTP to the user's email."""
    email = request.data.get("email")
    if not email:
        return Response(
            {"message": "Email is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    result = AuthenticationService.send_login_otp(email)
    http_status = status.HTTP_200_OK if result.success else status.HTTP_400_BAD_REQUEST
    if "No account" in result.message:
        http_status = status.HTTP_404_NOT_FOUND
    elif "deactivated" in result.message:
        http_status = status.HTTP_403_FORBIDDEN
    elif "Failed" in result.message:
        http_status = status.HTTP_500_INTERNAL_SERVER_ERROR

    payload = {"message": result.message}
    if result.success:
        payload["expiresIn"] = result.expires_in
    return Response(payload, status=http_status)


@api_view(["POST"])
@permission_classes([AllowAny])
def login_verify_otp(request) -> Response:
    """Verify login OTP and return JWT tokens."""
    email = request.data.get("email")
    submitted_otp = request.data.get("otp", "")
    submitted_time = request.data.get("submitted_at")

    result = AuthenticationService.verify_login_otp(email, submitted_otp, submitted_time)

    if not result.success:
        payload: dict = {"error": result.message}
        if result.expired:
            payload["expired"] = True
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "tokens": {
            "access": result.tokens.access,
            "refresh": result.tokens.refresh,
        },
        "user": UserSerializer(result.user).data,
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def login_resend_otp(request) -> Response:
    """Resend login OTP with rate limiting."""
    email = request.data.get("email")
    if not email:
        return Response(
            {"message": "Email is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    result = AuthenticationService.resend_login_otp(email)

    if not result.success:
        http_status = status.HTTP_429_TOO_MANY_REQUESTS if "wait" in result.message.lower() else status.HTTP_400_BAD_REQUEST
        if "No account" in result.message:
            http_status = status.HTTP_404_NOT_FOUND
        payload = {"message": result.message, "field": "email"}
        if result.cooldown_time:
            payload["cooldownRemaining"] = result.cooldown_time
        return Response(payload, status=http_status)

    return Response({
        "message": result.message,
        "expiresIn": result.expires_in,
        "cooldownTime": result.cooldown_time,
    })


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([AllowAny])
def google_auth(request) -> Response:
    """Authenticate an existing user via Google OAuth."""
    token = request.data.get("token")
    if not token:
        return Response({"message": "Token required"}, status=status.HTTP_400_BAD_REQUEST)

    result = AuthenticationService.google_login(token)
    if not result.success:
        http_status = status.HTTP_404_NOT_FOUND if "not found" in result.message.lower() else status.HTTP_400_BAD_REQUEST
        if "deactivated" in result.message:
            http_status = status.HTTP_403_FORBIDDEN
        return Response({"message": result.message}, status=http_status)

    return Response({
        "tokens": {
            "access": result.tokens.access,
            "refresh": result.tokens.refresh,
        },
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def google_pre_register(request) -> Response:
    """Check whether a Google user already exists or needs to register."""
    token = request.data.get("token")
    if not token:
        return Response({"message": "Token required"}, status=status.HTTP_400_BAD_REQUEST)

    info = AuthenticationService.verify_google_token(token)
    if "error" in info:
        return Response({"message": info["error"]}, status=status.HTTP_400_BAD_REQUEST)

    user = CustomUser.objects.filter(email=info["email"]).first()
    if user:
        if not user.is_active:
            return Response(
                {"message": "Your account has been deactivated. Please contact support."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response({"requires_username": False})

    return Response({"requires_username": True})


@api_view(["POST"])
@permission_classes([AllowAny])
def google_register(request) -> Response:
    """Register a new user via Google OAuth with a chosen username."""
    token = request.data.get("token")
    username = request.data.get("username", "").strip()

    if not token:
        return Response({"message": "Token required"}, status=status.HTTP_400_BAD_REQUEST)

    username_error = UserService.validate_username(username)
    if username_error:
        return Response({"error": username_error}, status=status.HTTP_400_BAD_REQUEST)

    info = AuthenticationService.verify_google_token(token)
    if "error" in info:
        return Response({"message": info["error"]}, status=status.HTTP_400_BAD_REQUEST)

    CustomUser.objects.create_user(
        email=info["email"],
        username=username,
        first_name=info["first_name"],
        last_name=info["last_name"],
        is_active=True,
    )
    return Response({"message": "User successfully registered"}, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

@api_view(["POST"])
@authentication_classes([])
@permission_classes([])
def logout(request) -> Response:
    """Blacklist the refresh token (logout)."""
    refresh_token = request.data.get("refresh_token")
    if not refresh_token:
        return Response(
            {"error": "Refresh token is required"}, status=status.HTTP_400_BAD_REQUEST
        )

    success, message = UserService.blacklist_refresh_token(refresh_token)
    return Response(
        {"message" if success else "error": message},
        status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST,
    )


# ---------------------------------------------------------------------------
# Registration (email/OTP flow)
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([AllowAny])
def initiate_registration(request) -> Response:
    """Start email registration by sending an OTP."""
    email = request.data.get("email")
    if not email:
        return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

    result = AuthenticationService.initiate_registration(email)
    if not result.success:
        http_status = status.HTTP_429_TOO_MANY_REQUESTS if "wait" in result.message.lower() else status.HTTP_400_BAD_REQUEST
        return Response({"error": result.message}, status=http_status)

    return Response({"message": result.message})


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_otp(request) -> Response:
    """Verify registration OTP."""
    email = request.data.get("email")
    submitted_otp = request.data.get("otp")

    if not email or not submitted_otp:
        return Response(
            {"error": "Email and OTP are required"}, status=status.HTTP_400_BAD_REQUEST
        )

    result = AuthenticationService.verify_registration_otp(email, submitted_otp)
    if not result["success"]:
        return Response({"error": result["message"]}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "message": result["message"],
        "verification_token": result["verification_token"],
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def resend_otp(request) -> Response:
    """Resend registration OTP."""
    email = request.data.get("email")
    if not email:
        return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

    result = AuthenticationService.resend_registration_otp(email)
    if not result.success:
        http_status = status.HTTP_429_TOO_MANY_REQUESTS if "wait" in result.message.lower() else status.HTTP_400_BAD_REQUEST
        return Response({"error": result.message}, status=http_status)

    return Response({"message": result.message})


@api_view(["POST"])
@permission_classes([AllowAny])
def complete_registration(request) -> Response:
    """Finalise registration with user details."""
    email = request.data.get("email")
    username = request.data.get("username", "").strip()

    username_error = UserService.validate_username(username)
    if username_error:
        return Response({"error": username_error}, status=status.HTTP_400_BAD_REQUEST)

    if not UserService.check_registration_session(email):
        return Response(
            {"error": "Registration session expired. Please start over."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = UserSerializer(data={
        "email": email,
        "first_name": request.data.get("firstName"),
        "last_name": request.data.get("lastName"),
        "username": username,
    })
    if serializer.is_valid():
        serializer.save()
        UserService.clear_registration_cache(email)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# User Profile
# ---------------------------------------------------------------------------

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def user_profile_view(request) -> Response:
    """Retrieve or update the current user's profile."""
    user = request.user

    if request.method == "GET":
        serializer = UserProfileSerializer(user)
        return Response(serializer.data)

    serializer = UserProfileSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_playlists_view(request) -> Response:
    """Retrieve all playlists created by the current user."""
    playlists = Playlist.objects.filter(created_by=request.user).annotate(
        tracks_count=Count("tracks")
    )
    serializer = PlaylistSerializer(playlists, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user(request) -> Response:
    """Get the current authenticated user's data."""
    serializer = UserSerializer(request.user, context={"request": request})
    return Response(serializer.data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def update_user(request) -> Response:
    """Update user profile (supports file uploads)."""
    serializer = UserSerializer(
        request.user,
        data=request.data,
        partial=True,
        context={"request": request},
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)