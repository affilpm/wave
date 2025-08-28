import os
import subprocess
import tempfile
import logging
from pathlib import Path
from celery import shared_task
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Music, StreamingFile, HLSQuality
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def convert_audio_to_hls(self, music_id):
    """
    Convert audio file to HLS format with multiple quality levels
    """
    try:
        # Add database query with error handling
        try:
            music = Music.objects.get(id=music_id)
        except Music.DoesNotExist:
            logger.error(f"Music with ID {music_id} does not exist")
            return {"status": "error", "message": "Music not found"}
        
        logger.info(f"Starting HLS conversion for music: {music.name} (ID: {music_id})")
        
        if not music.audio_file:
            logger.error(f"No audio file found for music ID: {music_id}")
            return {"status": "error", "message": "No audio file found"}
        
        # Check if audio file exists in storage
        if not default_storage.exists(music.audio_file.name):
            logger.error(f"Audio file does not exist in storage: {music.audio_file.name}")
            return {"status": "error", "message": "Audio file not found in storage"}
        
        # Download the original audio file to temporary location
        with tempfile.TemporaryDirectory() as temp_dir:
            # Download original file with better error handling
            file_extension = music.audio_file.name.split('.')[-1]
            original_file_path = os.path.join(temp_dir, f"original_{music_id}.{file_extension}")
            
            try:
                with default_storage.open(music.audio_file.name, 'rb') as source_file:
                    with open(original_file_path, 'wb') as dest_file:
                        dest_file.write(source_file.read())
                
                # Verify file was downloaded
                if not os.path.exists(original_file_path) or os.path.getsize(original_file_path) == 0:
                    raise Exception("Downloaded file is empty or doesn't exist")
                    
                logger.info(f"Downloaded original file: {original_file_path} ({os.path.getsize(original_file_path)} bytes)")
                
            except Exception as e:
                logger.error(f"Failed to download audio file: {str(e)}")
                return {"status": "error", "message": f"Failed to download audio file: {str(e)}"}
            
            # Define quality settings
            quality_settings = {
                HLSQuality.LOW: {
                    'bitrate': '64k',
                    'sample_rate': '22050',
                    'segment_time': '10'
                },
                HLSQuality.MEDIUM: {
                    'bitrate': '128k',
                    'sample_rate': '44100',
                    'segment_time': '10'
                },
                HLSQuality.HIGH: {
                    'bitrate': '320k',
                    'sample_rate': '44100',
                    'segment_time': '10'
                },
                HLSQuality.LOSSLESS: {
                    'bitrate': '1411k',
                    'sample_rate': '44100',
                    'segment_time': '10'
                }
            }
            
            created_streams = []
            
            for quality, settings_dict in quality_settings.items():
                try:
                    logger.info(f"Processing {quality} quality for music {music_id}")
                    
                    # Create quality-specific directory
                    quality_dir = os.path.join(temp_dir, quality)
                    os.makedirs(quality_dir, exist_ok=True)
                    
                    # HLS output paths
                    playlist_filename = f"{music_id}_{quality}.m3u8"
                    segment_pattern = f"{music_id}_{quality}_%03d.ts"
                    
                    playlist_path = os.path.join(quality_dir, playlist_filename)
                    
                    # FFmpeg command for HLS conversion
                    ffmpeg_cmd = [
                        'ffmpeg',
                        '-i', original_file_path,
                        '-c:a', 'aac',
                        '-b:a', settings_dict['bitrate'],
                        '-ar', settings_dict['sample_rate'],
                        '-f', 'hls',
                        '-hls_time', settings_dict['segment_time'],
                        '-hls_list_size', '0',
                        '-hls_segment_filename', os.path.join(quality_dir, segment_pattern),
                        playlist_path,
                        '-y'  # Overwrite output files
                    ]
                    
                    logger.info(f"Running FFmpeg for {quality}: {' '.join(ffmpeg_cmd)}")
                    
                    # Execute FFmpeg command
                    result = subprocess.run(
                        ffmpeg_cmd,
                        capture_output=True,
                        text=True,
                        timeout=3600  # 1 hour timeout
                    )
                    
                    if result.returncode != 0:
                        logger.error(f"FFmpeg failed for quality {quality}: {result.stderr}")
                        continue
                    
                    # Verify HLS files were created
                    if not os.path.exists(playlist_path):
                        logger.error(f"Playlist file not created for {quality}: {playlist_path}")
                        continue
                    
                    # Count generated segments
                    ts_files = list(Path(quality_dir).glob("*.ts"))
                    logger.info(f"Generated {len(ts_files)} segments for {quality} quality")
                    
                    if len(ts_files) == 0:
                        logger.error(f"No segment files generated for {quality}")
                        continue
                    
                    # Upload HLS files to S3
                    logger.info(f"Uploading HLS files for {quality} quality")
                    hls_url = upload_hls_files_to_s3(
                        music_id=music_id,
                        quality=quality,
                        quality_dir=quality_dir,
                        playlist_filename=playlist_filename
                    )
                    
                    if hls_url:
                        # Create or update StreamingFile record
                        streaming_file, created = StreamingFile.objects.get_or_create(
                            music=music,
                            quality=quality,
                            defaults={'hls_playlist': hls_url}
                        )
                        
                        if not created:
                            streaming_file.hls_playlist = hls_url
                            streaming_file.save()
                        
                        created_streams.append({
                            'quality': quality,
                            'url': hls_url,
                            'created': created,
                            'segments': len(ts_files)
                        })
                        
                        logger.info(f"Successfully created HLS stream for {quality} quality: {hls_url}")
                    else:
                        logger.error(f"Failed to upload HLS files for {quality} quality")
                    
                except subprocess.TimeoutExpired:
                    logger.error(f"FFmpeg timeout for quality {quality}")
                    continue
                except Exception as e:
                    logger.error(f"Error processing quality {quality}: {str(e)}")
                    continue
            
            if created_streams:
                logger.info(f"HLS conversion completed for music: {music.name}. Created {len(created_streams)} streams.")
                return {
                    "status": "success",
                    "message": f"Created {len(created_streams)} HLS streams",
                    "streams": created_streams
                }
            else:
                logger.error(f"No HLS streams were created for music: {music.name}")
                # If no streams were created, trigger cleanup
                cleanup_failed_hls_conversion.delay(music_id)
                return {
                    "status": "error",
                    "message": "No HLS streams were created"
                }
                
    except Exception as e:
        logger.error(f"Unexpected error in HLS conversion for music {music_id}: {str(e)}")
        # Retry the task if it's a temporary error
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying HLS conversion for music {music_id} (attempt {self.request.retries + 1})")
            self.retry(countdown=60)
        else:
            cleanup_failed_hls_conversion.delay(music_id)
        return {"status": "error", "message": str(e)}


def upload_hls_files_to_s3(music_id, quality, quality_dir, playlist_filename):
    """
    Upload HLS playlist and segment files to S3 (without ACL support)
    """
    try:
        # Verify AWS settings
        required_settings = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_STORAGE_BUCKET_NAME', 'AWS_S3_REGION_NAME']
        for setting in required_settings:
            if not hasattr(settings, setting) or not getattr(settings, setting):
                logger.error(f"Missing AWS setting: {setting}")
                return None
        
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        s3_base_path = f"media/hls/{music_id}/{quality}/"
        
        logger.info(f"Uploading to S3 bucket: {bucket_name}, path: {s3_base_path}")
        
        # Prepare common upload parameters (no ACL)
        base_extra_args = {
            'ContentType': None,  # Will be set per file
            'CacheControl': 'max-age=86400'
        }
        
        # Upload all files in the quality directory
        uploaded_files = []
        total_files = list(Path(quality_dir).iterdir())
        
        logger.info(f"Starting upload of {len(total_files)} files for {quality} quality")
        
        if len(total_files) == 0:
            logger.error(f"No files found in quality directory: {quality_dir}")
            return None
        
        for i, file_path in enumerate(total_files, 1):
            if file_path.is_file():
                s3_key = s3_base_path + file_path.name
                
                # Set content type for this specific file
                extra_args = base_extra_args.copy()
                extra_args['ContentType'] = get_content_type(file_path.name)
                
                try:
                    file_size = os.path.getsize(file_path)
                    logger.debug(f"Uploading {file_path.name} ({file_size} bytes) as {s3_key}")
                    
                    with open(file_path, 'rb') as file_data:
                        s3_client.upload_fileobj(
                            file_data,
                            bucket_name,
                            s3_key,
                            ExtraArgs=extra_args
                        )
                    uploaded_files.append(s3_key)
                    logger.info(f"Uploaded {file_path.name} ({i}/{len(total_files)})")
                    
                except ClientError as e:
                    error_code = e.response.get('Error', {}).get('Code', '')
                    logger.error(f"ClientError uploading {file_path.name}: {error_code} - {str(e)}")
                    return None
                except Exception as e:
                    logger.error(f"Unexpected error uploading {file_path.name}: {str(e)}")
                    return None
        
        if uploaded_files:
            # Return CloudFront URL for the playlist
            playlist_s3_key = s3_base_path + playlist_filename
            
            # Check if CloudFront domain is configured
            if hasattr(settings, 'CLOUDFRONT_DOMAIN') and settings.CLOUDFRONT_DOMAIN:
                cloudfront_url = f"https://{settings.CLOUDFRONT_DOMAIN}/{playlist_s3_key}"
            else:
                # Fallback to direct S3 URL
                cloudfront_url = f"https://{bucket_name}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{playlist_s3_key}"
                logger.warning("CLOUDFRONT_DOMAIN not configured, using direct S3 URL")
            
            logger.info(f"Successfully uploaded {len(uploaded_files)} HLS files for {quality} quality")
            logger.info(f"Playlist URL: {cloudfront_url}")
            return cloudfront_url
        
        logger.warning(f"No files were uploaded for {quality} quality")
        return None
        
    except Exception as e:
        logger.error(f"Error uploading HLS files to S3: {str(e)}")
        return None


def get_content_type(filename):
    """
    Get appropriate content type based on file extension
    """
    extension = filename.lower().split('.')[-1]
    content_types = {
        'm3u8': 'application/vnd.apple.mpegurl',
        'ts': 'video/mp2t',
        'mp4': 'video/mp4',
        'mp3': 'audio/mpeg'
    }
    return content_types.get(extension, 'application/octet-stream')


@shared_task(bind=True)
def cleanup_failed_hls_conversion(self, music_id):
    """
    Clean up any partial HLS files if conversion fails
    """
    try:
        logger.info(f"Starting cleanup for music {music_id}")
        
        # Remove any StreamingFile records that might have been created
        deleted_count = StreamingFile.objects.filter(music_id=music_id).count()
        StreamingFile.objects.filter(music_id=music_id).delete()
        logger.info(f"Deleted {deleted_count} StreamingFile records for music {music_id}")
        
        # Clean up S3 files
        if hasattr(settings, 'AWS_ACCESS_KEY_ID') and settings.AWS_ACCESS_KEY_ID:
            try:
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_S3_REGION_NAME
                )
                
                bucket_name = settings.AWS_STORAGE_BUCKET_NAME
                s3_prefix = f"media/hls/{music_id}/"
                
                # List and delete objects with the prefix
                response = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=s3_prefix)
                
                if 'Contents' in response:
                    objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
                    if objects_to_delete:
                        s3_client.delete_objects(
                            Bucket=bucket_name,
                            Delete={'Objects': objects_to_delete}
                        )
                        logger.info(f"Cleaned up {len(objects_to_delete)} S3 objects for music {music_id}")
                else:
                    logger.info(f"No S3 objects found to clean up for music {music_id}")
            except Exception as s3_error:
                logger.error(f"Error cleaning up S3 objects for music {music_id}: {str(s3_error)}")
        
        return {"status": "success", "message": "Cleanup completed"}
        
    except Exception as e:
        logger.error(f"Error during cleanup for music {music_id}: {str(e)}")
        return {"status": "error", "message": str(e)}


@shared_task(bind=True)
def regenerate_hls_for_music(self, music_id):
    """
    Regenerate HLS files for existing music (useful for updating quality settings)
    """
    try:
        logger.info(f"Starting HLS regeneration for music {music_id}")
        
        # First cleanup existing streams
        cleanup_result = cleanup_failed_hls_conversion(music_id)
        logger.info(f"Cleanup result: {cleanup_result}")
        
        # Then regenerate
        return convert_audio_to_hls(music_id)
        
    except Exception as e:
        logger.error(f"Error regenerating HLS for music {music_id}: {str(e)}")
        return {"status": "error", "message": str(e)}


@shared_task(bind=True)
def trigger_hls_conversion_for_music(self, music_id):
    """
    Manually trigger HLS conversion for a specific music ID.
    Useful for admin interface or API endpoints.
    """
    try:
        # Verify music exists
        if not Music.objects.filter(id=music_id, audio_file__isnull=False).exists():
            return {"status": "error", "message": "Music not found or has no audio file"}
        
        logger.info(f"Manually triggering HLS conversion for music {music_id}")
        return convert_audio_to_hls(music_id)
        
    except Exception as e:
        logger.error(f"Error manually triggering HLS conversion for music {music_id}: {str(e)}")
        return {"status": "error", "message": str(e)}

