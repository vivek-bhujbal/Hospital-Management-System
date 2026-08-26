"""
Celery application factory.

Redis URL is read from the environment so that no credentials are hard-coded.
Set CELERY_BROKER_URL and CELERY_RESULT_BACKEND in your .env file.

Example .env entries:
  CELERY_BROKER_URL=redis://localhost:6379/0
  CELERY_RESULT_BACKEND=redis://localhost:6379/1
"""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "hospital_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.notifications"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # Retry configuration
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    # Beat schedule for periodic reminders
    beat_schedule={},
)
