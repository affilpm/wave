"""
Centralised constants for the Wave platform.

All magic strings, numbers, and enumeration values live here so that
they can be referenced uniformly across the codebase.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# File Upload Limits
# ---------------------------------------------------------------------------
MAX_AUDIO_FILE_SIZE_MB: int = 100  # 100 MB
MAX_AUDIO_FILE_SIZE_BYTES: int = MAX_AUDIO_FILE_SIZE_MB * 1024 * 1024

MAX_IMAGE_FILE_SIZE_MB: int = 10  # 10 MB
MAX_IMAGE_FILE_SIZE_BYTES: int = MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024

MAX_VIDEO_FILE_SIZE_MB: int = 500  # 500 MB
MAX_VIDEO_FILE_SIZE_BYTES: int = MAX_VIDEO_FILE_SIZE_MB * 1024 * 1024


# ---------------------------------------------------------------------------
# Allowed MIME Types
# ---------------------------------------------------------------------------
ALLOWED_AUDIO_MIME_TYPES: frozenset[str] = frozenset(
    {
        "audio/mpeg",       # .mp3
        "audio/wav",        # .wav
        "audio/x-wav",      # .wav (alternative)
        "audio/aac",        # .aac
        "audio/mp4",        # .m4a
    }
)

ALLOWED_IMAGE_MIME_TYPES: frozenset[str] = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/webp",
    }
)

ALLOWED_VIDEO_MIME_TYPES: frozenset[str] = frozenset(
    {
        "video/mp4",
        "video/quicktime",  # .mov
    }
)


# ---------------------------------------------------------------------------
# Allowed File Extensions
# ---------------------------------------------------------------------------
ALLOWED_AUDIO_EXTENSIONS: frozenset[str] = frozenset(
    {"mp3", "wav", "aac", "m4a"}
)

ALLOWED_IMAGE_EXTENSIONS: frozenset[str] = frozenset(
    {"jpg", "jpeg", "png", "webp"}
)

ALLOWED_VIDEO_EXTENSIONS: frozenset[str] = frozenset(
    {"mp4", "mov"}
)


# ---------------------------------------------------------------------------
# Pagination Defaults
# ---------------------------------------------------------------------------
DEFAULT_PAGE_SIZE: int = 20
MAX_PAGE_SIZE: int = 100


# ---------------------------------------------------------------------------
# Celery Queue Names
# ---------------------------------------------------------------------------
CELERY_QUEUE_DEFAULT: str = "default"
CELERY_QUEUE_TRANSCODING: str = "transcoding"
CELERY_QUEUE_NOTIFICATIONS: str = "notifications"
CELERY_QUEUE_PAYOUTS: str = "payouts"


# ---------------------------------------------------------------------------
# Cache Key Prefixes
# ---------------------------------------------------------------------------
CACHE_PREFIX_LOGIN_OTP: str = "login_otp"
CACHE_PREFIX_REGISTRATION_OTP: str = "registration_otp"
CACHE_PREFIX_OTP_RATE_LIMIT: str = "otp_rate_limit"
CACHE_PREFIX_RESEND_COOLDOWN: str = "resend_cooldown"
CACHE_PREFIX_USER_EQ_PRESET: str = "user_eq_preset"
CACHE_PREFIX_VERIFICATION_TOKEN: str = "verification_token"
CACHE_PREFIX_REGISTRATION_EXTENDED: str = "registration_extended"

# ---------------------------------------------------------------------------
# OTP Settings
# ---------------------------------------------------------------------------
OTP_EXPIRY_SECONDS: int = 30
OTP_GRACE_PERIOD_SECONDS: int = 5
OTP_COOLDOWN_INITIAL_SECONDS: int = 30
OTP_COOLDOWN_MAX_SECONDS: int = 600  # 10 minutes
OTP_RATE_LIMIT_EXPIRY_SECONDS: int = 86400  # 24 hours


# ---------------------------------------------------------------------------
# HLS Content Types
# ---------------------------------------------------------------------------
HLS_CONTENT_TYPES: dict[str, str] = {
    "m3u8": "application/vnd.apple.mpegurl",
    "ts": "video/mp2t",
    "mp4": "video/mp4",
    "mp3": "audio/mpeg",
}
