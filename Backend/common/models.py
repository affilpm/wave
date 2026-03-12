"""
Common abstract base models for the Wave platform.

Provides reusable base classes that enforce consistent timestamp fields,
UUID primary keys, and standard Meta options across all application models.
"""

from __future__ import annotations

import uuid

from django.db import models


class TimeStampedModel(models.Model):
    """
    Abstract base model providing automatic ``created_at`` and ``updated_at``
    timestamp fields.

    All concrete models in the project should inherit from this class
    to guarantee a consistent audit trail.
    """

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when this record was created.",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when this record was last updated.",
    )

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class UUIDModel(TimeStampedModel):
    """
    Abstract base model that uses a UUID4 as the primary key.

    Use this for any model whose primary key may be exposed in
    public-facing URLs or API responses to prevent enumeration attacks.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier (UUID4).",
    )

    class Meta(TimeStampedModel.Meta):
        abstract = True
