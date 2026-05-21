"""
Base Django settings for the Wave Backend project.

This module contains settings shared across **all** environments.
Environment-specific overrides live in ``development.py`` and
``production.py``.

Settings reference:
    https://docs.djangoproject.com/en/5.0/ref/settings/
"""

from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
# BASE_DIR points to the *Backend/* directory (one level above this package).
BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------
SECRET_KEY: str = config("SECRET_KEY")

ALLOWED_HOSTS: list[str] = config("ALLOWED_HOSTS", default="localhost", cast=Csv())

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------
DJANGO_APPS: list[str] = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
]

THIRD_PARTY_APPS: list[str] = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "rest_framework.authtoken",
    "corsheaders",
    "django_extensions",
    "django_filters",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "dj_rest_auth",
    "dj_rest_auth.registration",
    "channels",
    "storages",
]

LOCAL_APPS: list[str] = [
    "common",
    "users",
    "artists",
    "music",
    "album",
    "admins",
    "playlist",
    "home",
    "library",
    "premium",
    "listening_history",
]

INSTALLED_APPS: list[str] = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "users.CustomUser"

AUTHENTICATION_BACKENDS = (
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
)

SITE_ID = 1

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
MIDDLEWARE: list[str] = [
    "corsheaders.middleware.CorsMiddleware",            # Must be first
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "csp.middleware.CSPMiddleware",
]

# ---------------------------------------------------------------------------
# URL / ASGI
# ---------------------------------------------------------------------------
ROOT_URLCONF = "Backend.urls"
ASGI_APPLICATION = "Backend.asgi.application"

# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ---------------------------------------------------------------------------
# Database — overridden per-environment; default is PostgreSQL.
# ---------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="wave"),
        "USER": config("DB_USER", default="postgres"),
        "PASSWORD": config("DB_PASSWORD", default=""),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432"),
    }
}

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Internationalisation
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

# ---------------------------------------------------------------------------
# Default primary key
# ---------------------------------------------------------------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {
        "music_streaming": "10/minute",
    },
    "EXCEPTION_HANDLER": "rest_framework.views.exception_handler",
}

# ---------------------------------------------------------------------------
# Simple JWT
# ---------------------------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "SIGNING_KEY": config("JWT_SIGNING_KEY", default=SECRET_KEY),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

REST_USE_JWT = True
TOKEN_MODEL = None

# ---------------------------------------------------------------------------
# Email / SMTP
# ---------------------------------------------------------------------------
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")

# ---------------------------------------------------------------------------
# Redis / Cache
# ---------------------------------------------------------------------------
REDIS_URL: str = config("REDIS_URL", default="redis://127.0.0.1:6379")

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": f"{REDIS_URL}/1",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    }
}

# ---------------------------------------------------------------------------
# Channels (WebSocket)
# ---------------------------------------------------------------------------
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [config("REDIS_URL", default="redis://127.0.0.1:6379")],
        },
    },
}

# ---------------------------------------------------------------------------
# Third-party service credentials
# ---------------------------------------------------------------------------
# Google OAuth
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY: str = config("SOCIAL_AUTH_GOOGLE_OAUTH2_KEY", default="")
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET: str = config("SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET", default="")
GOOGLE_CLIENT_ID: str = config("SOCIAL_AUTH_GOOGLE_OAUTH2_KEY", default="")

# Razorpay
RAZOR_KEY_ID: str = config("RAZOR_KEY_ID", default="")
RAZOR_KEY_SECRET: str = config("RAZOR_KEY_SECRET", default="")
RAZORPAY_KEY_ID: str = config("RAZOR_KEY_ID", default="")
RAZORPAY_KEY_SECRET: str = config("RAZOR_KEY_SECRET", default="")

# Agora
AGORA_APP_ID: str = config("AGORA_APP_ID", default="")
AGORA_APP_CERTIFICATE: str = config("AGORA_APP_CERTIFICATE", default="")

# ---------------------------------------------------------------------------
# AWS / S3 / CloudFront
# ---------------------------------------------------------------------------
AWS_STORAGE_BUCKET_NAME: str = config("AWS_STORAGE_BUCKET_NAME", default="")
AWS_S3_REGION_NAME: str = config("AWS_S3_REGION_NAME", default="us-east-1")
AWS_S3_ENDPOINT_URL: str = config("AWS_S3_ENDPOINT_URL", default="")
AWS_ACCESS_KEY_ID: str = config("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY: str = config("AWS_SECRET_ACCESS_KEY", default="")

AWS_S3_OBJECT_PARAMETERS: dict[str, str] = {
    "CacheControl": "max-age=86400",
}

AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_S3_ADDRESSING_STYLE = "path"

AWS_QUERYSTRING_AUTH: bool = True  # Sign S3 URLs for private/DRM content


CLOUDFRONT_DISTRIBUTION_ID: str = config("CLOUDFRONT_DISTRIBUTION_ID", default="")
CLOUDFRONT_DOMAIN: str = config("CLOUDFRONT_DOMAIN", default="")

# ---------------------------------------------------------------------------
# Celery
# ---------------------------------------------------------------------------
CELERY_BROKER_URL: str = config("CELERY_BROKER_URL", default=f"{REDIS_URL}/0")
CELERY_RESULT_BACKEND: str = config("CELERY_RESULT_BACKEND", default=f"{REDIS_URL}/0")
CELERY_ACCEPT_CONTENT: list[str] = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT: int = 7200  # 2 hours
CELERY_WORKER_CONCURRENCY: int = config("CELERY_WORKER_CONCURRENCY", default=4, cast=int)
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

# Task routing — separate queues for different workloads
# In development, we allow these to fall back to the default queue for simplicity
# if a dedicated worker is not running.
CELERY_TASK_ROUTES = {}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ALLOW_HEADERS: list[str] = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-client-ip",
    "range",  # Required for audio/video streaming
]

CORS_ALLOW_METHODS: list[str] = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

CORS_ALLOW_CREDENTIALS = True
APPEND_SLASH = True

# ---------------------------------------------------------------------------
# Security headers
# ---------------------------------------------------------------------------
SECURE_CONTENT_TYPE_NOSNIFF = True
CROSS_ORIGIN_OPENER_POLICY = "same-origin-allow-popups"

# ---------------------------------------------------------------------------
# CSRF
# ---------------------------------------------------------------------------
CSRF_TRUSTED_ORIGINS: list[str] = config(
    "CSRF_TRUSTED_ORIGINS",
    default="http://localhost:5173,http://localhost:8000",
    cast=Csv(),
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} [{name}] {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": True,
        },
        "music": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "celery": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "common": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
# ---------------------------------------------------------------------------
# Security headers (CSP)
# ---------------------------------------------------------------------------
CSP_DEFAULT_SRC = ("'self'", "https://*.affilpm.com")
CSP_IMG_SRC = ("'self'", "data:", "blob:", "https://*.s3.amazonaws.com", "https://*.cloudfront.net", "https://*.r2.cloudflarestorage.com", "https://*.cloudflare.com", "https://*.affilpm.com")
CSP_MEDIA_SRC = ("'self'", "blob:", "https://*.s3.amazonaws.com", "https://*.cloudfront.net", "https://*.r2.cloudflarestorage.com", "https://*.cloudflare.com", "https://*.affilpm.com")
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.affilpm.com", "https://static.cloudflareinsights.com")
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://*.affilpm.com")
CSP_FONT_SRC = ("'self'", "https://fonts.gstatic.com", "https://*.affilpm.com")
CSP_CONNECT_SRC = ("'self'", "https://*.affilpm.com", "wss://*.affilpm.com")
CSP_FRAME_SRC = ("'self'", "https://*.affilpm.com")
