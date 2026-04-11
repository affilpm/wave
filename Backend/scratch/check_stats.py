import os
import django
import sys

# Setup django
sys.path.append('/Users/affilpm/Documents/second project/Wave/Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Backend.settings.development')
django.setup()

from music.models import Music
from listening_history.models import MusicPlayCount, ListeningHistory, MusicActivity
from django.db.models import Sum

def check_stats():
    tracks = Music.objects.all()[:10]
    print(f"{'Name':<20} | {'PlayCount':<10} | {'HistSum':<10} | {'Activity':<10}")
    print("-" * 60)
    for track in tracks:
        play_stats = MusicPlayCount.objects.filter(music=track).first()
        play_count = play_stats.total_plays if play_stats else 0
        
        hist_sum = ListeningHistory.objects.filter(track=track).aggregate(Sum('play_count'))['play_count__sum'] or 0
        
        play_activity = MusicActivity.objects.filter(music=track, activity_type='play').count()
        complete_activity = MusicActivity.objects.filter(music=track, activity_type='complete').count()
        
        print(f"{track.name:<20} | {play_count:<10} | {hist_sum:<10} | P:{play_activity} C:{complete_activity}")

if __name__ == "__main__":
    check_stats()
