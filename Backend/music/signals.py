from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Music, MusicApprovalStatus, StreamingFile
from django.db import transaction
from .tasks import convert_audio_to_hls, cleanup_failed_hls_conversion
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender = Music)
def update_is_public(sender, instance, **kwargs):
    if instance.approval_status in [MusicApprovalStatus.PENDING, MusicApprovalStatus.REJECTED]:
        if instance.is_public:
            instance.is_public = False
            instance.save(update_fields = ['is_public'])
            
            

@receiver(post_save, sender=Music)
def auto_convert_to_hls(sender, instance, created, **kwargs):
    """
    Automatically convert audio to HLS format when a Music instance is created or updated.
    Uses transaction.on_commit to ensure DB operations are complete before queuing tasks.
    """
    def queue_hls_conversion():
        try:
            # Double-check that the instance still exists and has audio file
            if not Music.objects.filter(id=instance.id, audio_file__isnull=False).exists():
                logger.info(f"Skipping HLS conversion for music {instance.id} - no audio file or record deleted")
                return
            
            # Only process if music has an audio file
            if not instance.audio_file:
                logger.info(f"Skipping HLS conversion for {instance.name} - no audio file")
                return
            
            # Check if this is a new music upload or if the audio file was changed
            should_convert = False
            
            if created:
                # New music instance
                should_convert = True
                logger.info(f"New music created: {instance.name} (ID: {instance.id}) - triggering HLS conversion")
            else:
                # For updates, we need to compare with the previous state
                # Since we're in post_save, we can't easily get the old instance
                # So we'll check if there are existing StreamingFiles
                existing_streams = StreamingFile.objects.filter(music=instance).exists()
                if not existing_streams:
                    # No existing streams, likely a new upload
                    should_convert = True
                    logger.info(f"No existing HLS streams for {instance.name} (ID: {instance.id}) - triggering conversion")
            
            if should_convert:
                # Add a longer delay to ensure file upload is complete
                logger.info(f"Queuing HLS conversion task for music: {instance.name} (ID: {instance.id})")
                convert_audio_to_hls.apply_async(args=[instance.id], countdown=10)
                
        except Exception as e:
            logger.error(f"Error in queued HLS conversion for music {instance.id}: {str(e)}")
    
    # Use transaction.on_commit to ensure the database transaction is complete
    # This prevents race conditions where Celery task runs before DB commit
    transaction.on_commit(queue_hls_conversion)


@receiver(post_delete, sender=Music)
def cleanup_hls_files_on_delete(sender, instance, **kwargs):
    """
    Clean up HLS files when a Music instance is deleted
    """
    try:
        logger.info(f"Music deleted: {instance.name} (ID: {instance.id}) - cleaning up HLS files")
        cleanup_failed_hls_conversion.delay(instance.id)
    except Exception as e:
        logger.error(f"Error cleaning up HLS files for deleted music {instance.id}: {str(e)}")


@receiver(post_delete, sender=StreamingFile)
def log_streaming_file_deletion(sender, instance, **kwargs):
    """
    Log when streaming files are deleted
    """
    try:
        logger.info(f"StreamingFile deleted: {instance.music.name} - {instance.quality}")
    except Exception as e:
        logger.error(f"Error logging StreamingFile deletion: {str(e)}")



@receiver(post_save, sender=Music)
def handle_approval_status_change(sender, instance, created, **kwargs):
    """
    Handle actions when music approval status changes
    """
    if not created:  # Only for updates
        try:
            # Check if approval status changed to approved
            old_instance = Music.objects.get(pk=instance.pk)
            
            if (old_instance.approval_status != instance.approval_status and 
                instance.approval_status == 'approved'):
                
                # Ensure HLS files exist for approved music
                streaming_files_count = StreamingFile.objects.filter(music=instance).count()
                
                if streaming_files_count == 0 and instance.audio_file:
                    logger.info(f"Approved music {instance.name} has no HLS files - triggering conversion")
                    convert_audio_to_hls.delay(instance.id)
                    
        except Music.DoesNotExist:
            pass  # Old instance doesn't exist, skip
        except Exception as e:
            logger.error(f"Error in handle_approval_status_change for music {instance.id}: {str(e)}")            