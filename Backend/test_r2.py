import os
import boto3
from decouple import Config, RepositoryEnv
from botocore.config import Config as BotoConfig

# Load env
env_config = Config(RepositoryEnv('/Users/affilpm/Documents/second project/Wave/Backend/.env'))

endpoint = env_config('AWS_S3_ENDPOINT_URL')
access_key = env_config('AWS_ACCESS_KEY_ID')
secret_key = env_config('AWS_SECRET_ACCESS_KEY')
bucket = env_config('AWS_STORAGE_BUCKET_NAME')

print(f"Endpoint: {endpoint}")
print(f"Bucket: {bucket}")
print(f"Access Key: {access_key[:5]}...")

client = boto3.client(
    's3',
    endpoint_url=endpoint,
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name='us-east-1', # Try with auto first if needed, but R2 often likes us-east-1 for boto3 compatibility
    config=BotoConfig(signature_version='s3v4')
)

try:
    print("Testing list_objects_v2...")
    response = client.list_objects_v2(Bucket=bucket, MaxKeys=5)
    print("Success! Found objects:", len(response.get('Contents', [])))
except Exception as e:
    print("Error listing objects:", str(e))
