"""
User service layer — all authentication and user-management business logic.

Views should delegate to these functions instead of containing logic
directly.
"""

from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass

from django.conf import settings
from django.core.cache import cache
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

from rest_framework_simplejwt.tokens import RefreshToken

from google.auth.transport.requests import Request
from google.oauth2 import id_token

from users.models import CustomUser
from users.utils import generate_otp, send_otp_email

from common.constants import (
    CACHE_PREFIX_LOGIN_OTP,
    CACHE_PREFIX_REGISTRATION_OTP,
    CACHE_PREFIX_OTP_RATE_LIMIT,
    CACHE_PREFIX_RESEND_COOLDOWN,
    CACHE_PREFIX_VERIFICATION_TOKEN,
    CACHE_PREFIX_REGISTRATION_EXTENDED,
    OTP_EXPIRY_SECONDS,
    OTP_GRACE_PERIOD_SECONDS,
    OTP_COOLDOWN_INITIAL_SECONDS,
    OTP_COOLDOWN_MAX_SECONDS,
    OTP_RATE_LIMIT_EXPIRY_SECONDS,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# DTOs (Data Transfer Objects)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class TokenPair:
    """JWT access + refresh token pair."""
    access: str
    refresh: str


@dataclass(frozen=True)
class OTPResult:
    """Result of an OTP send attempt."""
    success: bool
    message: str
    expires_in: int = OTP_EXPIRY_SECONDS
    cooldown_time: int = OTP_COOLDOWN_INITIAL_SECONDS


@dataclass(frozen=True)
class AuthResult:
    """Result of an authentication attempt."""
    success: bool
    message: str
    tokens: TokenPair | None = None
    user: CustomUser | None = None
    expired: bool = False


# ---------------------------------------------------------------------------
# Authentication Service
# ---------------------------------------------------------------------------

class AuthenticationService:
    """Handles OTP generation, verification, token creation, and Google OAuth."""

    # --- OTP Login Flow ---

    @staticmethod
    def send_login_otp(email: str) -> OTPResult:
        """
        Generate and send a login OTP to the given email.

        Returns:
            OTPResult indicating success/failure and timing.
        """
        user = CustomUser.objects.filter(email=email).first()
        if not user:
            return OTPResult(success=False, message="No account found with this email")

        if not user.is_active:
            return OTPResult(
                success=False,
                message="Your account has been deactivated. Please contact support.",
            )

        otp = generate_otp()
        cache_key = f"{CACHE_PREFIX_LOGIN_OTP}_{email}"
        cache.set(cache_key, otp, timeout=OTP_EXPIRY_SECONDS)

        cooldown_key = f"{CACHE_PREFIX_RESEND_COOLDOWN}_{email}"
        cache.set(cooldown_key, True, timeout=OTP_COOLDOWN_INITIAL_SECONDS)

        try:
            send_otp_email(email, otp)
            return OTPResult(success=True, message="OTP sent successfully")
        except Exception:
            logger.exception("Failed to send OTP email to %s", email)
            return OTPResult(success=False, message="Failed to send OTP")

    @staticmethod
    def verify_login_otp(
        email: str,
        submitted_otp: str,
        submitted_time: float | str | None = None,
    ) -> AuthResult:
        """
        Verify a login OTP and return JWT tokens on success.

        Supports a grace period: if the OTP expired but the user submitted
        before it expired, we still accept it.
        """
        submitted_otp = str(submitted_otp).strip()

        cache_key = f"{CACHE_PREFIX_LOGIN_OTP}_{email}"
        stored_otp = cache.get(cache_key)

        grace_key = f"{CACHE_PREFIX_LOGIN_OTP}_grace_{email}"
        grace_data = cache.get(grace_key)

        # Determine the valid OTP
        valid_otp: str | None = None
        if stored_otp is not None:
            valid_otp = str(stored_otp).strip()
        elif grace_data is not None and isinstance(grace_data, tuple) and len(grace_data) == 2:
            grace_otp, grace_expiry = grace_data
            if isinstance(submitted_time, str):
                try:
                    submitted_time = float(submitted_time)
                except (ValueError, TypeError):
                    submitted_time = None
            if submitted_time and submitted_time <= grace_expiry:
                valid_otp = str(grace_otp).strip()

        if valid_otp is None:
            return AuthResult(
                success=False,
                message="OTP has expired. Please request a new OTP.",
                expired=True,
            )

        if submitted_otp != valid_otp:
            return AuthResult(success=False, message="Invalid OTP")

        # OTP valid — generate tokens
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return AuthResult(success=False, message="User not found")

        tokens = AuthenticationService._create_token_pair(user)

        cache.delete(cache_key)
        cache.delete(grace_key)

        return AuthResult(success=True, message="Login successful", tokens=tokens, user=user)

    @staticmethod
    def resend_login_otp(email: str) -> OTPResult:
        """Resend login OTP with exponential backoff rate-limiting."""
        try:
            validate_email(email)
        except ValidationError:
            return OTPResult(success=False, message="Invalid email format")

        cooldown_key = f"{CACHE_PREFIX_RESEND_COOLDOWN}_{email}"
        if cache.get(cooldown_key):
            ttl = cache.ttl(cooldown_key) or OTP_COOLDOWN_INITIAL_SECONDS
            return OTPResult(
                success=False,
                message=f"Please wait {ttl} seconds before requesting another OTP",
                cooldown_time=ttl,
            )

        user = CustomUser.objects.filter(email=email).first()
        if not user:
            return OTPResult(success=False, message="No account found with this email")

        rate_limit_key = f"{CACHE_PREFIX_OTP_RATE_LIMIT}_{email}"
        attempts = cache.get(rate_limit_key, 0)
        cooldown_time = min(
            OTP_COOLDOWN_INITIAL_SECONDS * (2 ** min(attempts, 4)),
            OTP_COOLDOWN_MAX_SECONDS,
        )

        otp = generate_otp()
        cache_key = f"{CACHE_PREFIX_LOGIN_OTP}_{email}"

        # Grace period for the old OTP
        grace_key = f"{CACHE_PREFIX_LOGIN_OTP}_grace_{email}"
        current_otp = cache.get(cache_key)
        if current_otp:
            grace_expiry = time.time() + OTP_EXPIRY_SECONDS
            cache.set(grace_key, (current_otp, grace_expiry), timeout=OTP_GRACE_PERIOD_SECONDS)

        cache.set(cache_key, otp, timeout=OTP_EXPIRY_SECONDS)
        cache.set(cooldown_key, True, timeout=cooldown_time)
        cache.set(rate_limit_key, attempts + 1, timeout=OTP_RATE_LIMIT_EXPIRY_SECONDS)

        try:
            send_otp_email(email, otp)
            return OTPResult(
                success=True,
                message="OTP resent successfully",
                cooldown_time=cooldown_time,
            )
        except Exception:
            logger.exception("Failed to resend OTP to %s", email)
            return OTPResult(success=False, message="Failed to send OTP")

    # --- Registration Flow ---

    @staticmethod
    def initiate_registration(email: str) -> OTPResult:
        """Start the registration flow by sending an OTP to a new email."""
        if CustomUser.objects.filter(email=email).exists():
            return OTPResult(success=False, message="Email already registered")

        rate_limit_key = f"{CACHE_PREFIX_OTP_RATE_LIMIT}_{email}"
        if cache.get(rate_limit_key):
            return OTPResult(
                success=False, message="Please wait before requesting another OTP"
            )

        otp = generate_otp()
        cache_key = f"{CACHE_PREFIX_REGISTRATION_OTP}_{email}"
        cache.set(cache_key, str(otp), timeout=OTP_EXPIRY_SECONDS)
        cache.set(rate_limit_key, True, timeout=OTP_COOLDOWN_INITIAL_SECONDS)

        try:
            send_otp_email(email, otp)
            return OTPResult(success=True, message="OTP sent successfully")
        except Exception:
            logger.exception("Failed to send registration OTP to %s", email)
            return OTPResult(success=False, message="Failed to send OTP")

    @staticmethod
    def verify_registration_otp(email: str, submitted_otp: str) -> dict:
        """Verify registration OTP and return a verification token."""
        cache_key = f"{CACHE_PREFIX_REGISTRATION_OTP}_{email}"
        stored_otp = cache.get(cache_key)

        if not stored_otp or stored_otp != submitted_otp:
            return {"success": False, "message": "Invalid or expired OTP"}

        verification_token = generate_otp()
        cache.set(
            f"{CACHE_PREFIX_VERIFICATION_TOKEN}_{email}",
            verification_token,
            timeout=300,
        )
        cache.set(
            f"{CACHE_PREFIX_REGISTRATION_EXTENDED}_{email}",
            True,
            timeout=300,
        )

        return {
            "success": True,
            "message": "OTP verified successfully",
            "verification_token": verification_token,
        }

    @staticmethod
    def resend_registration_otp(email: str) -> OTPResult:
        """Resend the registration OTP with rate limiting."""
        if CustomUser.objects.filter(email=email).exists():
            return OTPResult(success=False, message="Email already registered")

        rate_limit_key = f"{CACHE_PREFIX_OTP_RATE_LIMIT}_{email}"
        if cache.get(rate_limit_key):
            remaining = cache.ttl(rate_limit_key) or OTP_COOLDOWN_INITIAL_SECONDS
            return OTPResult(
                success=False,
                message=f"Please wait {remaining} seconds before requesting another OTP",
                cooldown_time=remaining,
            )

        otp = generate_otp()
        cache_key = f"{CACHE_PREFIX_REGISTRATION_OTP}_{email}"
        cache.set(cache_key, str(otp), timeout=OTP_EXPIRY_SECONDS)
        cache.set(rate_limit_key, True, timeout=OTP_COOLDOWN_INITIAL_SECONDS)

        try:
            send_otp_email(email, otp)
            return OTPResult(success=True, message="OTP sent successfully")
        except Exception:
            logger.exception("Failed to resend registration OTP to %s", email)
            return OTPResult(success=False, message="Failed to send OTP")

    # --- Google OAuth ---

    @staticmethod
    def verify_google_token(token: str) -> dict:
        """
        Verify a Google OAuth2 ID token and return user info.

        Returns:
            Dict with 'email', 'first_name', 'last_name' on success,
            or 'error' on failure.
        """
        try:
            idinfo = id_token.verify_oauth2_token(
                token, Request(), settings.GOOGLE_CLIENT_ID
            )
            if idinfo["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
                return {"error": "Invalid issuer"}

            return {
                "email": idinfo["email"],
                "first_name": idinfo.get("given_name", ""),
                "last_name": idinfo.get("family_name", ""),
            }
        except Exception as exc:
            logger.exception("Google token verification failed")
            return {"error": str(exc)}

    @staticmethod
    def google_login(token: str) -> AuthResult:
        """Authenticate an existing user via Google OAuth."""
        info = AuthenticationService.verify_google_token(token)
        if "error" in info:
            return AuthResult(success=False, message=info["error"])

        user = CustomUser.objects.filter(email=info["email"]).first()
        if not user:
            return AuthResult(
                success=False,
                message="Email not found. Please sign up to continue.",
            )
        if not user.is_active:
            return AuthResult(
                success=False,
                message="Your account has been deactivated. Please contact support.",
            )

        tokens = AuthenticationService._create_token_pair(user)
        return AuthResult(success=True, message="Login successful", tokens=tokens, user=user)

    # --- Helpers ---

    @staticmethod
    def _create_token_pair(user: CustomUser) -> TokenPair:
        """Generate a JWT access + refresh token pair with custom claims."""
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        access["email"] = user.email
        access["username"] = user.username
        access["user_id"] = user.id
        access["first_name"] = user.first_name
        access["last_name"] = user.last_name
        access["profile_photo"] = (
            user.profile_photo.url if user.profile_photo else None
        )
        return TokenPair(access=str(access), refresh=str(refresh))


# ---------------------------------------------------------------------------
# User Service
# ---------------------------------------------------------------------------

class UserService:
    """User profile and account management logic."""

    USERNAME_MIN_LENGTH = 3
    USERNAME_MAX_LENGTH = 30
    USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_]+$")

    @staticmethod
    def validate_username(username: str) -> str | None:
        """
        Validate a username and return an error message, or ``None`` if valid.
        """
        if not username:
            return "Username is required"
        if " " in username or re.search(r"\s", username):
            return "Username cannot contain spaces"
        if len(username) < UserService.USERNAME_MIN_LENGTH or len(username) > UserService.USERNAME_MAX_LENGTH:
            return f"Username must be between {UserService.USERNAME_MIN_LENGTH} and {UserService.USERNAME_MAX_LENGTH} characters"
        if not UserService.USERNAME_PATTERN.match(username):
            return "Username can only contain letters, numbers, and underscores"
        if CustomUser.objects.filter(username=username).exists():
            return "Username already exists"
        return None

    @staticmethod
    def check_registration_session(email: str) -> bool:
        """Return ``True`` if the registration session is still active."""
        extended_key = f"{CACHE_PREFIX_REGISTRATION_EXTENDED}_{email}"
        return bool(cache.get(extended_key))

    @staticmethod
    def clear_registration_cache(email: str) -> None:
        """Remove all registration-related cache entries for the given email."""
        cache.delete(f"{CACHE_PREFIX_REGISTRATION_EXTENDED}_{email}")
        cache.delete(f"{CACHE_PREFIX_VERIFICATION_TOKEN}_{email}")
        cache.delete(f"{CACHE_PREFIX_REGISTRATION_OTP}_{email}")

    @staticmethod
    def blacklist_refresh_token(refresh_token: str) -> tuple[bool, str]:
        """
        Blacklist a refresh token (logout).

        Returns:
            (success, message) tuple.
        """
        from rest_framework_simplejwt.exceptions import TokenError
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return True, "Logout successful"
        except TokenError:
            return False, "Invalid or expired token"
