"""
Root URL configuration for the Wave Backend.

All API endpoints are served under ``/api/v1/`` to enforce versioning.
"""

from __future__ import annotations

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

# ---------------------------------------------------------------------------
# API v1 namespaced routes
# ---------------------------------------------------------------------------
api_v1_patterns: list = [
    path("users/", include("users.urls")),
    path("artists/", include("artists.urls")),
    path("admins/", include("admins.urls")),
    path("music/", include("music.urls")),
    path("album/", include("album.urls")),
    path("playlist/", include("playlist.urls")),
    path("home/", include("home.urls")),
    path("library/", include("library.urls")),
    path("premium/", include("premium.urls")),
    path("listening-history/", include("listening_history.urls")),
    path("", include("common.urls")),
]

urlpatterns: list = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1_patterns)),

    # Backwards-compatible non-versioned routes (deprecate in future)
    path("api/users/", include("users.urls")),
    path("api/artists/", include("artists.urls")),
    path("api/admins/", include("admins.urls")),
    path("api/music/", include("music.urls")),
    path("api/album/", include("album.urls")),
    path("api/playlist/", include("playlist.urls")),
    path("api/home/", include("home.urls")),
    path("api/library/", include("library.urls")),
    path("api/premium/", include("premium.urls")),
    path("api/listening-history/", include("listening_history.urls")),
]

# ---------------------------------------------------------------------------
# Serve media files locally during development
# ---------------------------------------------------------------------------
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=getattr(settings, "MEDIA_ROOT", ""))
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
