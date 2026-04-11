"""
Reusable file-upload validators for the Wave platform.

Validates MIME type, file extension, and file size to prevent
malicious or oversized uploads from reaching storage backends.
"""

from __future__ import annotations

import mimetypes
import os
from typing import Collection

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile

from common.constants import (
    ALLOWED_AUDIO_EXTENSIONS,
    ALLOWED_AUDIO_MIME_TYPES,
    ALLOWED_IMAGE_EXTENSIONS,
    ALLOWED_IMAGE_MIME_TYPES,
    ALLOWED_VIDEO_EXTENSIONS,
    ALLOWED_VIDEO_MIME_TYPES,
    MAX_AUDIO_FILE_SIZE_BYTES,
    MAX_IMAGE_FILE_SIZE_BYTES,
    MAX_VIDEO_FILE_SIZE_BYTES,
)


def _validate_file(
    file: UploadedFile,
    *,
    allowed_mime_types: Collection[str],
    allowed_extensions: Collection[str],
    max_size_bytes: int,
    file_kind: str,
) -> None:
    """
    Generic file validator checking MIME type, extension, and size.

    Args:
        file: The uploaded file to validate.
        allowed_mime_types: Set of acceptable MIME types.
        allowed_extensions: Set of acceptable file extensions (without dot).
        max_size_bytes: Maximum allowed file size in bytes.
        file_kind: Human-readable label used in error messages (e.g. "audio").

    Raises:
        ValidationError: If any check fails.
    """
    # --- Extension check ---
    _, ext = os.path.splitext(file.name)
    ext_clean = ext.lstrip(".").lower()
    if ext_clean not in allowed_extensions:
        allowed = ", ".join(sorted(allowed_extensions))
        raise ValidationError(
            f"Unsupported {file_kind} file extension '.{ext_clean}'. "
            f"Allowed: {allowed}."
        )

    # --- MIME type check ---
    # Prefer the content_type reported by the client, but cross-check
    # with the guessed type from the extension.
    content_type = getattr(file, "content_type", None) or ""
    guessed_type, _ = mimetypes.guess_type(file.name)

    if content_type not in allowed_mime_types:
        # Fall back to guessed type before rejecting
        if guessed_type not in allowed_mime_types:
            allowed = ", ".join(sorted(allowed_mime_types))
            raise ValidationError(
                f"Unsupported {file_kind} MIME type '{content_type}'. "
                f"Allowed: {allowed}."
            )

    # --- Size check ---
    max_mb = max_size_bytes / (1024 * 1024)
    if file.size and file.size > max_size_bytes:
        raise ValidationError(
            f"{file_kind.capitalize()} file exceeds the maximum allowed size "
            f"of {max_mb:.0f} MB."
        )


def validate_audio_upload(file: UploadedFile) -> None:
    """Validate an uploaded audio file (MIME, extension, size)."""
    _validate_file(
        file,
        allowed_mime_types=ALLOWED_AUDIO_MIME_TYPES,
        allowed_extensions=ALLOWED_AUDIO_EXTENSIONS,
        max_size_bytes=MAX_AUDIO_FILE_SIZE_BYTES,
        file_kind="audio",
    )


def validate_image_upload(file: UploadedFile) -> None:
    """Validate an uploaded image file (MIME, extension, size)."""
    _validate_file(
        file,
        allowed_mime_types=ALLOWED_IMAGE_MIME_TYPES,
        allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
        max_size_bytes=MAX_IMAGE_FILE_SIZE_BYTES,
        file_kind="image",
    )


def validate_video_upload(file: UploadedFile) -> None:
    """Validate an uploaded video file (MIME, extension, size)."""
    _validate_file(
        file,
        allowed_mime_types=ALLOWED_VIDEO_MIME_TYPES,
        allowed_extensions=ALLOWED_VIDEO_EXTENSIONS,
        max_size_bytes=MAX_VIDEO_FILE_SIZE_BYTES,
        file_kind="video",
    )
