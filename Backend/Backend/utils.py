# In a file like storage_backends.py in one of your apps or in a utils directory

from storages.backends.s3boto3 import S3Boto3Storage

class MediaStorage(S3Boto3Storage):
    location = 'media'
    default_acl = 'public-read'
    file_overwrite = True
    
    def _save(self, name, content):
        # Ensure the file is saved with its original name in the media directory
        name = self._normalize_name(self._join(self.location, name))
        return super()._save(name, content)