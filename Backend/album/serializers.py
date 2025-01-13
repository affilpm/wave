from rest_framework import serializers
from music.models import Album, AlbumTrack
from music.serializers import MusicSerializer


class AlbumTrackSerializer(serializers.ModelSerializer):
    track_details = MusicSerializer(source='track', read_only=True)
    
    class Meta:
        model = AlbumTrack
        fields = ['id', 'track', 'track_number', 'track_details']
        extra_kwargs = {
            'track': {'write_only': True}
        }





class AlbumSerializer(serializers.ModelSerializer):
    tracks = AlbumTrackSerializer(source='albumtrack_set', many=True, required=False)
    class Meta:
        model = Album
        fields = [
            'id', 'name', 'description', 'cover_photo', 
            'banner_img', 'release_date', 'status', 'is_public',
            'tracks', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_tracks_count(self, obj):
        return obj.tracks.count()    

    def create(self, validated_data):
        tracks_data = validated_data.pop('albumtrack_set', [])
        album = Album.objects.create(**validated_data)
        
        for track_data in tracks_data:
            AlbumTrack.objects.create(album=album, **track_data)
        
        return album

    def update(self, instance, validated_data):
        tracks_data = validated_data.pop('albumtrack_set', [])
        
        # Update album fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update tracks
        instance.albumtrack_set.all().delete()
        for track_data in tracks_data:
            AlbumTrack.objects.create(album=instance, **track_data)
        
        return instance
        