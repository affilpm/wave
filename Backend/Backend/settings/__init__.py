"""
Django settings for the Wave Backend project.

Settings are split across three modules:
- ``base.py``          — shared settings for all environments
- ``development.py``   — local/dev-machine overrides
- ``production.py``    — deployment overrides

The active module is selected via the ``DJANGO_SETTINGS_MODULE`` env-var.
Default: ``Backend.settings.development``
"""
