"""
Development-specific Django settings.

Usage:
    DJANGO_SETTINGS_MODULE=Backend.settings.development python manage.py runserver
"""

from __future__ import annotations

from .base import *  # noqa: F401, F403

# ---------------------------------------------------------------------------
# Debug
# ---------------------------------------------------------------------------
DEBUG = True

# ---------------------------------------------------------------------------
# Hosts
# ---------------------------------------------------------------------------
ALLOWED_HOSTS = ["*"]

# ---------------------------------------------------------------------------
# CORS — permissive in development only
# ---------------------------------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

# ---------------------------------------------------------------------------
# Media — serve locally during development (no S3)
# ---------------------------------------------------------------------------
USE_S3_MEDIA_STORAGE: bool = config("USE_S3_MEDIA_STORAGE", default=False, cast=bool)  # noqa: F405

if USE_S3_MEDIA_STORAGE and AWS_STORAGE_BUCKET_NAME:  # noqa: F405
    MEDIA_DOMAIN = config("R2_CUSTOM_DOMAIN", default=config("CLOUDFRONT_DOMAIN", default=""))
    MEDIA_URL = f"https://{MEDIA_DOMAIN}/media/"
    STATIC_URL = f"https://{MEDIA_DOMAIN}/static/"

    STORAGES = {
        "default": {
            "BACKEND": "Backend.storage_backends.CloudFrontMediaStorage",
            "OPTIONS": {
                "bucket_name": AWS_STORAGE_BUCKET_NAME,  # noqa: F405
                "endpoint_url": AWS_S3_ENDPOINT_URL,  # noqa: F405
                "region_name": AWS_S3_REGION_NAME,  # noqa: F405
                "addressing_style": "path",
                "location": "media",
                "file_overwrite": False,
            },
        },
        "staticfiles": {
            "BACKEND": "Backend.storage_backends.StaticStorage",
            "OPTIONS": {
                "bucket_name": AWS_STORAGE_BUCKET_NAME,  # noqa: F405
                "endpoint_url": AWS_S3_ENDPOINT_URL,  # noqa: F405
                "region_name": AWS_S3_REGION_NAME,  # noqa: F405
                "addressing_style": "path",
                "location": "static",
            },
        },
    }

else:
    import os

    MEDIA_URL = "/media/"
    MEDIA_ROOT = os.path.join(BASE_DIR, "media")  # noqa: F405
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }

# ---------------------------------------------------------------------------
# Email — console backend for development
# ---------------------------------------------------------------------------
# Uncomment below to print emails to console instead of sending via SMTP:
# EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# ---------------------------------------------------------------------------
# Logging — more verbose in development
# ---------------------------------------------------------------------------
LOGGING["loggers"]["music"]["level"] = "DEBUG"  # noqa: F405

# ---------------------------------------------------------------------------
# CSRF trusted origins for local dev
# ---------------------------------------------------------------------------
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000",
]

# ---------------------------------------------------------------------------
# CSP local dev overrides
# ---------------------------------------------------------------------------
CSP_IMG_SRC += ("http://127.0.0.1:8000", "http://localhost:8000")
CSP_MEDIA_SRC += ("http://127.0.0.1:8000", "http://localhost:8000")
CSP_CONNECT_SRC += (
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "ws://127.0.0.1:8000",
    "ws://localhost:8000",
)
