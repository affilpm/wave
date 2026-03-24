from django.utils.timezone import now
from django.db import transaction
from django.db.models import F

from ..models import (
    MusicActivity, 
    MusicActivityType, 
    MusicPlayCount, 
    ArtistActivity, 
    ArtistPlayCount, 
    RecentlyPlayed,
    ListeningHistory
)

def record_activity(user, music, activity_type=MusicActivityType.PLAY, source_type=None, source_id=None):
    """
    Record user activity with a track.
    - PLAY -> logs raw activity and updates/creates ListeningHistory.
    - COMPLETE -> updates aggregated play counters.
    """
    artist = music.artist
    
    # Derive album from first AlbumTrack if not provided or if we want to ensure consistency
    # (Tracks are M2M with Albums via AlbumTrack)
    album = None
    album_track = music.albumtrack_set.first()
    if album_track:
        album = album_track.album

    with transaction.atomic():
        # 1. Raw activity log
        MusicActivity.objects.create(
            user=user,
            music=music,
            activity_type=activity_type,
        )

        # 2. Detailed Listening History (Unique per user + track)
        # We use select_for_update to handle concurrency safely if not using F() for all fields
        history, created = ListeningHistory.objects.select_for_update().get_or_create(
            user=user,
            track=music,
            defaults={
                "artist": artist,
                "album": album,
                "source_type": source_type or ListeningHistory.SourceType.SINGLE,
                "source_id": source_id,
                "play_count": 1
            }
        )
        
        if not created:
            history.play_count = F("play_count") + 1
            history.last_played_at = now()
            if source_type:
                history.source_type = source_type
            if source_id:
                history.source_id = source_id
            history.save(update_fields=["play_count", "last_played_at", "source_type", "source_id"])

        # 3. Aggregated counts (Only on COMPLETE or optionally on PLAY)
        # Standard behavior: increment totals on PLAY or COMPLETE? 
        # Requirement says: "When a user listens to a track" -> increment.
        if activity_type == MusicActivityType.COMPLETE:
            # Music-level play count
            play_count, _ = MusicPlayCount.objects.get_or_create(music=music)
            play_count.total_plays = F("total_plays") + 1
            play_count.save(update_fields=["total_plays"])

            # Artist-level play count
            artist_count, _ = ArtistPlayCount.objects.get_or_create(artist=artist)
            artist_count.total_plays = F("total_plays") + 1
            artist_count.save(update_fields=["total_plays"])

            # User–artist relationship
            artist_activity, _ = ArtistActivity.objects.get_or_create(
                user=user, artist=artist
            )
            artist_activity.total_plays = F("total_plays") + 1
            artist_activity.last_played = now()
            artist_activity.save(update_fields=["total_plays", "last_played"])

            # Recently played (cache/v1)
            RecentlyPlayed.objects.update_or_create(
                user=user,
                music=music,
                defaults={"last_played": now()},
            )