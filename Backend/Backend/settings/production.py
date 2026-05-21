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
# Media & Static Storage — R2 (S3) or Local
# ---------------------------------------------------------------------------
USE_S3_MEDIA_STORAGE = config("USE_S3_MEDIA_STORAGE", default=True, cast=bool)

if USE_S3_MEDIA_STORAGE:
    MEDIA_DOMAIN = config("R2_CUSTOM_DOMAIN", default=config("CLOUDFRONT_DOMAIN", default=""))
    STATIC_DOMAIN = MEDIA_DOMAIN
    MEDIA_URL = f"https://{MEDIA_DOMAIN}/media/" if MEDIA_DOMAIN else "/media/"
    STATIC_URL = f"https://{STATIC_DOMAIN}/static/" if STATIC_DOMAIN else "/static/"

    STORAGES = {
        "default": {
            "BACKEND": "Backend.storage_backends.CloudFrontMediaStorage",
            "OPTIONS": {
                "bucket_name": AWS_STORAGE_BUCKET_NAME,
                "endpoint_url": AWS_S3_ENDPOINT_URL,
                "region_name": AWS_S3_REGION_NAME,
                "addressing_style": "path",
                "location": "media",
                "file_overwrite": False,
            },
        },
        "staticfiles": {
            "BACKEND": "Backend.storage_backends.StaticStorage",
            "OPTIONS": {
                "bucket_name": AWS_STORAGE_BUCKET_NAME,
                "endpoint_url": AWS_S3_ENDPOINT_URL,
                "region_name": AWS_S3_REGION_NAME,
                "addressing_style": "path",
                "location": "static",
            },
        },
    }
else:
    MEDIA_URL = "/media/"
    STATIC_URL = "/static/"
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
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
