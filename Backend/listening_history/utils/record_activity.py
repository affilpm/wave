from django.utils.timezone import now
from django.db import transaction

from ..models import MusicActivity, MusicActivityType, MusicPlayCount, ArtistActivity, ArtistPlayCount, RecentlyPlayed

def record_activity(user, music, activity_type=MusicActivityType.PLAY):
    """
    Record user activity with a track.
    - PLAY -> just logs activity (for history/analytics).
    - COMPLETE -> updates counters (plays, artists, recents).
    """
    artist = music.artist

    with transaction.atomic():
        
        MusicActivity.objects.create(
            user=user,
            music=music,
            activity_type=activity_type,
        )

        if activity_type == MusicActivityType.COMPLETE:
            # Music-level play count
            play_count, _ = MusicPlayCount.objects.get_or_create(music=music)
            play_count.total_plays += 1
            play_count.save(update_fields=["total_plays"])

            # Artist-level play count
            artist_count, _ = ArtistPlayCount.objects.get_or_create(artist=artist)
            artist_count.total_plays += 1
            artist_count.save(update_fields=["total_plays"])

            # User–artist relationship
            artist_activity, _ = ArtistActivity.objects.get_or_create(
                user=user, artist=artist
            )
            artist_activity.total_plays += 1
            artist_activity.last_played = now()
            artist_activity.save(update_fields=["total_plays", "last_played"])

            # Recently played (cache)
            RecentlyPlayed.objects.update_or_create(
                user=user,
                music=music,
                defaults={"last_played": now()},
            )   