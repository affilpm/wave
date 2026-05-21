"""
Celery tasks for HLS audio transcoding and S3 upload.

Tasks are designed to be idempotent — re-running on the same music_id
will overwrite previous HLS files rather than creating duplicates.
"""

from __future__ import annotations

import logging
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any

import boto3
from botocore.exceptions import ClientError
from celery import shared_task
from django.conf import settings
from django.core.files.storage import default_storage

from common.constants import HLS_CONTENT_TYPES
from music.models import HLSQuality, Music, StreamingFile

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Quality settings
# ---------------------------------------------------------------------------

QUALITY_SETTINGS: dict[str, dict[str, str]] = {
    HLSQuality.LOW: {
        "bitrate": "64k",
        "sample_rate": "22050",
        "segment_time": "10",
    },
    HLSQuality.MEDIUM: {
        "bitrate": "128k",
        "sample_rate": "44100",
        "segment_time": "10",
    },
    HLSQuality.HIGH: {
        "bitrate": "320k",
        "sample_rate": "44100",
        "segment_time": "10",
    },
    HLSQuality.LOSSLESS: {
        "bitrate": "1411k",
        "sample_rate": "44100",
        "segment_time": "10",
    },
}

FFMPEG_TIMEOUT_SECONDS = 3600  # 1 hour


# ---------------------------------------------------------------------------
# Public Celery tasks
# ---------------------------------------------------------------------------

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def convert_audio_to_hls(self, music_id: int) -> dict[str, Any]:
    """
    Convert an audio file to HLS format with multiple quality levels.

    Idempotent: existing ``StreamingFile`` records for the same
    music + quality are updated rather than duplicated.
    """
    try:
        music = Music.objects.get(id=music_id)
    except Music.DoesNotExist:
        logger.error("Music id=%s does not exist", music_id)
        return {"status": "error", "message": "Music not found"}

    logger.info("Starting HLS conversion music=%s id=%s", music.name, music_id)

    if not music.audio_file:
        logger.error("No audio file for music id=%s", music_id)
        return {"status": "error", "message": "No audio file found"}

    if not default_storage.exists(music.audio_file.name):
        logger.error("Audio file missing from storage: %s", music.audio_file.name)
        return {"status": "error", "message": "Audio file not found in storage"}

    try:
        created_streams = _transcode_all_qualities(music_id, music)
    except Exception as exc:
        logger.exception("Unexpected error in HLS conversion music_id=%s", music_id)
        if self.request.retries < self.max_retries:
            logger.info(
                "Retrying HLS conversion music_id=%s attempt=%s",
                music_id, self.request.retries + 1,
            )
            self.retry(countdown=60)
        else:
            cleanup_failed_hls_conversion.delay(music_id)
        return {"status": "error", "message": str(exc)}

    if created_streams:
        logger.info(
            "HLS conversion complete music=%s streams=%s",
            music.name, len(created_streams),
        )
        return {
            "status": "success",
            "message": f"Created {len(created_streams)} HLS streams",
            "streams": created_streams,
        }

    logger.error("No HLS streams created for music=%s", music.name)
    cleanup_failed_hls_conversion.delay(music_id)
    return {"status": "error", "message": "No HLS streams were created"}


@shared_task(bind=True)
def cleanup_failed_hls_conversion(self, music_id: int) -> dict[str, str]:
    """Clean up partial HLS artefacts after a failed conversion."""
    try:
        logger.info("Starting cleanup music_id=%s", music_id)
        deleted = StreamingFile.objects.filter(music_id=music_id).delete()[0]
        logger.info("Deleted %s StreamingFile records music_id=%s", deleted, music_id)
        _cleanup_s3_objects(music_id)
        return {"status": "success", "message": "Cleanup completed"}
    except Exception as exc:
        logger.exception("Cleanup failed music_id=%s", music_id)
        return {"status": "error", "message": str(exc)}


@shared_task(bind=True)
def regenerate_hls_for_music(self, music_id: int) -> dict[str, Any]:
    """Re-generate HLS files (cleanup old, then transcode fresh)."""
    logger.info("Regenerating HLS music_id=%s", music_id)
    cleanup_failed_hls_conversion(music_id)
    return convert_audio_to_hls(music_id)


@shared_task(bind=True)
def trigger_hls_conversion_for_music(self, music_id: int) -> dict[str, Any]:
    """Manually trigger HLS conversion (admin / API entry-point)."""
    if not Music.objects.filter(id=music_id, audio_file__isnull=False).exists():
        return {"status": "error", "message": "Music not found or has no audio file"}
    logger.info("Manual HLS trigger music_id=%s", music_id)
    return convert_audio_to_hls(music_id)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _transcode_all_qualities(
    music_id: int, music: Music,
) -> list[dict[str, Any]]:
    """Download the original file and transcode to every quality tier."""
    created_streams: list[dict[str, Any]] = []

    with tempfile.TemporaryDirectory() as temp_dir:
        original_path = _download_original(music, music_id, temp_dir)

        for quality, cfg in QUALITY_SETTINGS.items():
            try:
                result = _transcode_single_quality(
                    music_id, music, original_path, quality, cfg, temp_dir,
                )
                if result:
                    created_streams.append(result)
            except subprocess.TimeoutExpired:
                logger.error("FFmpeg timeout quality=%s music_id=%s", quality, music_id)
            except Exception:
                logger.exception("Error processing quality=%s music_id=%s", quality, music_id)

    return created_streams


def _download_original(music: Music, music_id: int, temp_dir: str) -> str:
    """Download the original audio file from storage to a temp directory."""
    ext = music.audio_file.name.rsplit(".", 1)[-1]
    dest = os.path.join(temp_dir, f"original_{music_id}.{ext}")

    with default_storage.open(music.audio_file.name, "rb") as src:
        with open(dest, "wb") as dst:
            dst.write(src.read())

    size = os.path.getsize(dest)
    if size == 0:
        raise RuntimeError("Downloaded file is empty")
    logger.info("Downloaded original file=%s bytes=%s", dest, size)
    return dest


def _transcode_single_quality(
    music_id: int,
    music: Music,
    original_path: str,
    quality: str,
    cfg: dict[str, str],
    temp_dir: str,
) -> dict[str, Any] | None:
    """Transcode, upload, and register a single quality tier."""
    logger.info("Processing quality=%s music_id=%s", quality, music_id)

    quality_dir = os.path.join(temp_dir, quality)
    os.makedirs(quality_dir, exist_ok=True)

    playlist_name = f"{music_id}_{quality}.m3u8"
    segment_pattern = f"{music_id}_{quality}_%03d.ts"
    playlist_path = os.path.join(quality_dir, playlist_name)

    cmd = [
        "ffmpeg",
        "-i", original_path,
        "-c:a", "aac",
        "-b:a", cfg["bitrate"],
        "-ar", cfg["sample_rate"],
        "-f", "hls",
        "-hls_time", cfg["segment_time"],
        "-hls_list_size", "0",
        "-hls_segment_filename", os.path.join(quality_dir, segment_pattern),
        playlist_path,
        "-y",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=FFMPEG_TIMEOUT_SECONDS)
    if result.returncode != 0:
        logger.error("FFmpeg failed quality=%s stderr=%s", quality, result.stderr[:500])
        return None

    ts_files = list(Path(quality_dir).glob("*.ts"))
    if not ts_files or not os.path.exists(playlist_path):
        logger.error("No output files quality=%s", quality)
        return None

    logger.info("Generated %s segments quality=%s", len(ts_files), quality)

    # Handle S3 upload if enabled AND not in DEBUG mode (unless explicitly forced)
    # We prioritize local storage in DEBUG mode to simplify development.
    should_use_s3 = getattr(settings, 'USE_S3_MEDIA_STORAGE', False) and not settings.DEBUG
    
    if should_use_s3:
        hls_url = _upload_hls_to_s3(music_id, quality, quality_dir, playlist_name)
    else:
        # For local storage, we'll store the relative path in the media directory
        relative_path = os.path.join("hls", str(music_id), quality, playlist_name)
        hls_url = os.path.join(settings.MEDIA_URL, relative_path)
        
        # Ensure local media directory exists and move files there
        local_hls_dir = os.path.join(settings.MEDIA_ROOT, "hls", str(music_id), quality)
        os.makedirs(local_hls_dir, exist_ok=True)
        
        import shutil
        for fp in Path(quality_dir).iterdir():
            if fp.is_file():
                shutil.copy2(fp, os.path.join(local_hls_dir, fp.name))
        
        logger.info("Copied HLS files to local storage: %s", local_hls_dir)

    if not hls_url:
        return None

    # Upsert StreamingFile (idempotent)
    streaming_file, created = StreamingFile.objects.update_or_create(
        music=music,
        quality=quality,
        defaults={"hls_playlist": hls_url},
    )

    logger.info(
        "HLS stream %s quality=%s url=%s",
        "created" if created else "updated", quality, hls_url,
    )
    return {
        "quality": quality,
        "url": hls_url,
        "created": created,
        "segments": len(ts_files),
    }


def _upload_hls_to_s3(
    music_id: int,
    quality: str,
    quality_dir: str,
    playlist_filename: str,
) -> str | None:
    """Upload HLS playlist and segments to S3, return the CloudFront/S3 URL."""
    required = ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_STORAGE_BUCKET_NAME", "AWS_S3_REGION_NAME")
    for attr in required:
        if not getattr(settings, attr, None):
            logger.error("Missing AWS setting: %s", attr)
            return None

    endpoint_url = getattr(settings, "AWS_S3_ENDPOINT_URL", None) or None
    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
        endpoint_url=endpoint_url,
    )
    bucket = settings.AWS_STORAGE_BUCKET_NAME
    prefix = f"media/hls/{music_id}/{quality}/"

    files = [p for p in Path(quality_dir).iterdir() if p.is_file()]
    if not files:
        logger.error("No files to upload quality=%s", quality)
        return None

    uploaded = 0
    for i, fp in enumerate(files, 1):
        key = prefix + fp.name
        content_type = HLS_CONTENT_TYPES.get(fp.suffix.lstrip("."), "application/octet-stream")
        try:
            with open(fp, "rb") as fh:
                s3.upload_fileobj(
                    fh, bucket, key,
                    ExtraArgs={"ContentType": content_type, "CacheControl": "max-age=86400"},
                )
            uploaded += 1
            logger.debug("Uploaded %s (%s/%s)", fp.name, i, len(files))
        except ClientError as exc:
            logger.error("S3 upload failed file=%s error=%s", fp.name, exc)
            return None

    if uploaded == 0:
        return None

    playlist_key = prefix + playlist_filename
    media_domain = getattr(settings, "MEDIA_DOMAIN", "") or getattr(settings, "CLOUDFRONT_DOMAIN", "")
    if media_domain:
        url = f"https://{media_domain}/{playlist_key}"
    else:
        url = f"https://{bucket}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{playlist_key}"
        logger.warning("MEDIA_DOMAIN/CLOUDFRONT_DOMAIN not configured — using direct S3 URL")

    logger.info("Uploaded %s HLS files quality=%s", uploaded, quality)
    return url


def _cleanup_s3_objects(music_id: int) -> None:
    """Delete all S3 objects under the HLS prefix for a music track."""
    if not getattr(settings, "AWS_ACCESS_KEY_ID", None):
        return

    try:
        endpoint_url = getattr(settings, "AWS_S3_ENDPOINT_URL", None) or None
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
            endpoint_url=endpoint_url,
        )
        bucket = settings.AWS_STORAGE_BUCKET_NAME
        prefix = f"media/hls/{music_id}/"

        resp = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
        objects = [{"Key": o["Key"]} for o in resp.get("Contents", [])]
        if objects:
            s3.delete_objects(Bucket=bucket, Delete={"Objects": objects})
            logger.info("Cleaned up %s S3 objects music_id=%s", len(objects), music_id)
    except Exception:
        logger.exception("S3 cleanup failed music_id=%s", music_id)
