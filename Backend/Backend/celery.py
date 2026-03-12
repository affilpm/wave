"""
Celery application configuration for the Wave Backend.

Provides:
- Auto-discovery of tasks in all installed Django apps
- Task routing to dedicated queues (transcoding, notifications, payouts)
- Structured logging for task lifecycle events

Usage:
    celery -A Backend worker -Q default,transcoding,notifications,payouts -l info
"""

from __future__ import annotations

import logging
import os

from celery import Celery
from celery.signals import after_setup_logger, task_failure, task_postrun, task_prerun

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Django settings
# ---------------------------------------------------------------------------
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Backend.settings.development")

app = Celery("Backend")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


# ---------------------------------------------------------------------------
# Structured lifecycle logging
# ---------------------------------------------------------------------------

@task_prerun.connect
def _task_prerun_handler(sender: object = None, task_id: str = "", **kwargs: object) -> None:
    """Log structured info when a Celery task begins execution."""
    logger.info(
        "task_started task_id=%s task_name=%s",
        task_id,
        getattr(sender, "name", "unknown"),
    )


@task_postrun.connect
def _task_postrun_handler(
    sender: object = None,
    task_id: str = "",
    state: str = "",
    **kwargs: object,
) -> None:
    """Log structured info when a Celery task finishes."""
    logger.info(
        "task_finished task_id=%s task_name=%s state=%s",
        task_id,
        getattr(sender, "name", "unknown"),
        state,
    )


@task_failure.connect
def _task_failure_handler(
    sender: object = None,
    task_id: str = "",
    exception: BaseException | None = None,
    **kwargs: object,
) -> None:
    """Log structured info when a Celery task fails."""
    logger.error(
        "task_failed task_id=%s task_name=%s error=%s",
        task_id,
        getattr(sender, "name", "unknown"),
        str(exception),
    )