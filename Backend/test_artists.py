import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "wave.settings")
django.setup()

from artists.models import Artist

artists = Artist.objects.filter(musical_works__is_public=True).distinct()
print(f"Artists with public music: {artists.count()}")
for a in artists[:5]:
    print(f"- {a.user.username} (user id: {a.user.id})")
