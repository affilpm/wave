from rest_framework.throttling import UserRateThrottle

class MusicStreamingRateThrottle(UserRateThrottle):
    scope = "music_streaming"   # scope name