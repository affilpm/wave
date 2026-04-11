"""
Custom S3 / CloudFront storage backends for the Wave platform.

Provides:
- ``CloudFrontMediaStorage``  — public media served via CloudFront
- ``PrivateMediaStorage``     — DRM-protected content with signed URLs
"""

from __future__ import annotations

from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class CloudFrontMediaStorage(S3Boto3Storage):
    """
    S3 storage backend that serves files through a CloudFront distribution.

    Used for public media assets (cover photos, profile images, etc.).
    """

    location: str = "media"
    file_overwrite: bool = False
    default_acl: str | None = None
    custom_domain: str = getattr(settings, "CLOUDFRONT_DOMAIN", "")

    def __init__(self, **kwargs: object) -> None:
        super().__init__(**kwargs)
        # Re-read at init time in case settings changed after module import
        if not self.custom_domain:
            self.custom_domain = getattr(settings, "CLOUDFRONT_DOMAIN", "")


class PrivateMediaStorage(S3Boto3Storage):
    """
    S3 storage backend for DRM-protected / premium content.

    Files are stored with ``querystring_auth=True`` so every URL is a
    time-limited signed URL that expires after ``AWS_QUERYSTRING_EXPIRE``
    seconds (default: 3600 = 1 hour).
    """

    location: str = "media/private"
    file_overwrite: bool = False
    default_acl: str = "private"
    querystring_auth: bool = True
    querystring_expire: int = 3600  # 1 hour

    def __init__(self, **kwargs: object) -> None:
        super().__init__(**kwargs)
        self.querystring_expire = getattr(
            settings, "AWS_QUERYSTRING_EXPIRE", self.querystring_expire
        )