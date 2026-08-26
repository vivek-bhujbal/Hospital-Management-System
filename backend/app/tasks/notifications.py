"""
Celery tasks for notification dispatch.

Design decisions:
- Each task reads the user's NotificationPreference before dispatching
  to respect per-user channel opt-outs.
- Deduplication: we set a unique Celery task_id based on
  (notification_id) so the same notification cannot be enqueued twice.
- Failed tasks retry up to 3 times with exponential backoff.
- Provider credentials come from the NotificationProvider.config JSON
  field — never hard-coded here.
- Passwords, tokens, and secrets are never passed into or logged by tasks.
"""
import hashlib
import logging
from datetime import datetime, timezone
from celery import shared_task
from celery.exceptions import MaxRetriesExceededError
from app.celery_app import celery_app

logger = logging.getLogger(__name__)

MAX_RETRIES = 3


def _get_db():
    """Return a fresh DB session for use inside a Celery task."""
    from app.database import SessionLocal
    return SessionLocal()


@celery_app.task(
    bind=True,
    name="app.tasks.notifications.dispatch_notification",
    max_retries=MAX_RETRIES,
    default_retry_delay=60,
    acks_late=True,
)
def dispatch_notification(self, notification_id: int):
    """
    Dispatch a single notification record.

    Steps:
      1. Load the Notification row.
      2. Check user preferences; skip silently if channel is opted-out.
      3. Look up the active provider for that channel.
      4. Call the provider-specific sender stub.
      5. Mark notification as sent / failed and record retry_count.
    """
    db = _get_db()
    try:
        from app.models.all_models import Notification, NotificationPreference, NotificationProvider

        notif = db.query(Notification).filter(Notification.id == notification_id).first()
        if not notif:
            logger.warning("Notification record was not found; skipping dispatch.")
            return

        # Already sent — deduplicate
        if notif.status == "sent":
            logger.info("Notification was already sent; skipping duplicate dispatch.")
            return

        # Check user preference
        prefs = db.query(NotificationPreference).filter(
            NotificationPreference.user_id == notif.user_id
        ).first()

        channel_enabled = True
        if prefs:
            channel_map = {
                "email": prefs.email_enabled,
                "sms": prefs.sms_enabled,
                "whatsapp": prefs.whatsapp_enabled,
                "in_app": prefs.in_app_enabled,
            }
            channel_enabled = channel_map.get(notif.channel, True)

        if not channel_enabled:
            logger.info(
                f"User {notif.user_id} has opted out of {notif.channel}; "
                f"marking notification {notification_id} as sent (suppressed)."
            )
            notif.status = "sent"
            notif.sent_at = datetime.now(timezone.utc)
            db.commit()
            return

        # Find active provider
        provider = db.query(NotificationProvider).filter(
            NotificationProvider.channel == notif.channel,
            NotificationProvider.is_active == True,
        ).first()

        if notif.channel == "in_app":
            # In-app: mark sent immediately (frontend polls/websocket picks it up)
            notif.status = "sent"
            notif.sent_at = datetime.now(timezone.utc)
            db.commit()
            logger.info("In-app notification marked as sent.")
            return

        if not provider:
            raise RuntimeError(
                f"No active provider for channel '{notif.channel}'. "
                "Configure one in notification_providers."
            )

        # Call provider stub (real implementation would use provider.config)
        _send_via_provider(provider, notif)

        notif.status = "sent"
        notif.sent_at = datetime.now(timezone.utc)
        notif.retry_count = self.request.retries
        db.commit()
        logger.info("Notification dispatch completed.")

    except Exception as exc:
        db.rollback()
        notif_obj = db.query(__import__("app.models.all_models", fromlist=["Notification"]).Notification).filter_by(id=notification_id).first()
        if notif_obj:
            notif_obj.retry_count = self.request.retries + 1
            notif_obj.error_message = str(exc)[:500]
            db.commit()

        logger.error("Notification dispatch failed; retry %s/%s.", self.request.retries, MAX_RETRIES)
        try:
            raise self.retry(exc=exc, countdown=2 ** (self.request.retries + 1) * 30)
        except MaxRetriesExceededError:
            if notif_obj:
                notif_obj.status = "failed"
                db.commit()
            logger.error("Notification permanently failed after the configured retries.")
    finally:
        db.close()


def _send_via_provider(provider, notif):
    """
    Stub dispatcher.  In production, inspect provider.config to retrieve
    API keys from a secrets manager and call the actual SDK.
    Credentials must NEVER be hard-coded in source code.
    """
    raise RuntimeError(
        f"No executable adapter is installed for notification channel '{notif.channel}'"
    )


def enqueue_notification(
    db,
    user_id: int,
    notif_type: str,
    channel: str,
    body: str,
    subject: str = None,
    entity_type: str = None,
    entity_id: int = None,
):
    """
    Helper called from routers / services to create a Notification record
    and enqueue the Celery task in one step.

    Deduplication: if an identical (user_id, type, entity_type, entity_id,
    channel, status='pending') row already exists, we skip enqueueing.
    """
    from app.models.all_models import Notification

    raw_key = f"{user_id}|{notif_type}|{channel}|{entity_type or ''}|{entity_id or ''}"
    idempotency_key = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    existing = db.query(Notification).filter(
        Notification.idempotency_key == idempotency_key,
    ).first()

    if existing:
        logger.info(f"Duplicate notification suppressed for user {user_id} type {notif_type}.")
        return existing

    notif = Notification(
        user_id=user_id,
        type=notif_type,
        channel=channel,
        subject=subject,
        body=body,
        entity_type=entity_type,
        entity_id=entity_id,
        status="pending",
        idempotency_key=idempotency_key,
    )
    db.add(notif)
    db.flush()
    db.commit()

    task = dispatch_notification.apply_async(
        args=[notif.id],
        task_id=f"notif-{notif.id}",
    )
    notif.celery_task_id = task.id
    db.commit()
    return notif
