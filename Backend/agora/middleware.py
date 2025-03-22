import time
from django.utils import timezone
from django.db import connection

class LivestreamCleanupMiddleware:
    """
    Middleware to periodically clean up stale livestream participants.
    
    This ensures accurate participant counts even if users don't explicitly leave
    or if their heartbeat requests fail.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.last_cleanup = time.time()
        # Run cleanup every 30 seconds at most
        self.cleanup_interval = 30
        
    def __call__(self, request):
        # Only process for livestream-related endpoints to reduce overhead
        if '/api/livestream/' in request.path:
            current_time = time.time()
            # Check if enough time has passed since last cleanup
            if current_time - self.last_cleanup > self.cleanup_interval:
                self.perform_cleanup()
                self.last_cleanup = current_time
                
        response = self.get_response(request)
        return response
    
    def perform_cleanup(self):
        """Clean up stale participants."""
        from .models import StreamParticipant  # Import here to avoid circular imports
        
        try:
            # Mark participants inactive if no heartbeat in the last minute
            stale_time = timezone.now() - timezone.timedelta(minutes=1)
            stale_count = StreamParticipant.objects.filter(
                is_active=True,
                last_active__lt=stale_time
            ).update(is_active=False)
            
            if stale_count > 0:
                print(f"Cleanup: Marked {stale_count} stale participants as inactive")
                
        except Exception as e:
            # Log error but don't crash the application
            print(f"Error in livestream cleanup middleware: {str(e)}")

