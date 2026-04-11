"""
Production-specific Django settings.

Usage:
    DJANGO_SETTINGS_MODULE=Backend.settings.production
"""

from __future__ import annotations

from .base import *  # noqa: F401, F403

# ---------------------------------------------------------------------------
# Debug — NEVER True in production
# ---------------------------------------------------------------------------
DEBUG = False

# ---------------------------------------------------------------------------
# Hosts — restrict to known domains
# ---------------------------------------------------------------------------
ALLOWED_HOSTS = config("ALLOWED_HOSTS", cast=Csv())  # noqa: F405

# ---------------------------------------------------------------------------
# CORS — explicit allow-list only
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS: list[str] = config(
    "CORS_ALLOWED_ORIGINS",
    default="https://api.affils.site",
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = config("CORS_ALLOW_CREDENTIALS", default=True, cast=bool)

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------
SECURE_HSTS_SECONDS = 31_536_000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
# SECURE_SSL_REDIRECT should be True for the real server, but False for local Docker testing
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=False, cast=bool)
SESSION_COOKIE_SECURE = SECURE_SSL_REDIRECT
CSRF_COOKIE_SECURE = SECURE_SSL_REDIRECT
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# ---------------------------------------------------------------------------
# Media Storage — S3 + CloudFront in production
# ---------------------------------------------------------------------------
MEDIA_URL = f"https://{CLOUDFRONT_DOMAIN}/media/"  # noqa: F405

STORAGES = {
    "default": {
        "BACKEND": "Backend.storage_backends.CloudFrontMediaStorage",
        "OPTIONS": {
            "bucket_name": AWS_STORAGE_BUCKET_NAME,  # noqa: F405
            "location": "media",
            "file_overwrite": False,
        },
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# ---------------------------------------------------------------------------
# Logging — less verbose, no DEBUG level
# ---------------------------------------------------------------------------
LOGGING["loggers"]["music"]["level"] = "INFO"  # noqa: F405
LOGGING["loggers"]["django"]["level"] = "WARNING"  # noqa: F405

# ---------------------------------------------------------------------------
# CSRF trusted origins
# ---------------------------------------------------------------------------
CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    default="https://api.affils.site",
    cast=Csv(),
)
