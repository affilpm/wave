import urllib.request
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage
from django.conf import settings
from django.utils import timezone
from users.models import CustomUser
from artists.models import Artist, ArtistVerificationStatus
from music.models import Genre, Music, Album, AlbumStatus
import io
import uuid
import os

class Command(BaseCommand):
    help = 'Populates the database with dummy users, artists, genres, and music'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing dummy music tracks before populating',
        )

    def handle(self, *args, **options):
        clear = options.get('clear')
        self.stdout.write("Starting dummy data population...")

        if clear:
            self.stdout.write("Clearing existing dummy music tracks...")
            # We identify dummy tracks by their naming convention in this script
            Music.objects.filter(name__startswith="Dummy Track").delete()
        
        # 1. Download dummy media (1 audio, 1 image)
        dummy_audio_url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        dummy_image_url = "https://picsum.photos/400/400"
        
        self.stdout.write("Downloading dummy audio...")
        try:
            audio_content = urllib.request.urlopen(dummy_audio_url).read()
            self.stdout.write("Downloading dummy image...")
            image_content = urllib.request.urlopen(dummy_image_url).read()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to download dummy media: {e}"))
            return

        # 2. Create Genres
        genres_data = [
            {'name': 'Pop', 'description': 'Popular music'},
            {'name': 'Rock', 'description': 'Rock music'},
            {'name': 'Electronic', 'description': 'Electronic dance music'},
            {'name': 'Hip Hop', 'description': 'Hip Hop music'}
        ]
        
        created_genres = []
        for g_data in genres_data:
            genre, created = Genre.objects.get_or_create(name=g_data['name'], defaults={'description': g_data['description']})
            created_genres.append(genre)
            if created:
                 self.stdout.write(f"Created genre: {genre.name}")

        # 3. Create Users and Artists
        num_artists = 3
        created_artists = []
        
        for i in range(num_artists):
            email = f"dummy_artist_{i+1}@example.com"
            username = f"dummy_artist_{i+1}"
            
            # Create user
            user, u_created = CustomUser.objects.get_or_create(
                email=email,
                defaults={
                    'username': username,
                    'first_name': f"Dummy{i+1}",
                    'last_name': "Artist",
                    'is_active': True,
                }
            )
            if u_created:
                user.set_password('password123')
                user.save()
            
            # Create Artist profile
            artist, a_created = Artist.objects.get_or_create(
                user=user,
                defaults={
                    'bio': f"This is purely a dummy artist {i+1} for testing purposes.",
                    'status': ArtistVerificationStatus.APPROVED
                }
            )
            if a_created:
                # Add some genres
                artist.genres.add(created_genres[i % len(created_genres)])
                self.stdout.write(f"Created artist: {username}")
                
            created_artists.append(artist)

        # 4. Create Music Tracks
        tracks_per_artist = 2
        for artist in created_artists:
            for j in range(tracks_per_artist):
                track_name = f"Dummy Track {j+1} by {artist.user.username}"
                
                # Check if exists to avoid duplicates (unless cleared)
                if Music.objects.filter(name=track_name).exists():
                    self.stdout.write(f"Track already exists: {track_name}")
                    continue
                
                track = Music(
                    artist=artist,
                    name=track_name,
                    approval_status='approved',
                    release_date=timezone.now(),
                    is_public=True
                )
                
                file_uuid = uuid.uuid4().hex[:8]
                
                # Save files - should work normally now with local storage
                track.audio_file.save(f"dummy_audio_{file_uuid}.mp3", ContentFile(audio_content), save=False)
                track.cover_photo.save(f"dummy_cover_{file_uuid}.jpg", ContentFile(image_content), save=False)
                track.save()
                
                # Add genres
                track.genres.add(*artist.genres.all())
                self.stdout.write(f"Created track: {track.name}")

        self.stdout.write(self.style.SUCCESS("Successfully populated dummy data!"))
