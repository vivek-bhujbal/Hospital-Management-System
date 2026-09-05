"""
Real-time WebSocket endpoints and notification management API.

WebSocket topics:
  /ws/{topic}?token=<jwt>

Topics:
  patient_checkin    - receptionist / doctor queues
  queue_update       - appointment queue changes
  doctor_status      - doctor availability
  emergency_dispatch - ambulance / emergency events
  lab_status         - lab order status updates
  pharmacy_status    - prescription / dispensing updates
  appointment_status - appointment state changes
  notifications      - per-user live notification refresh events
"""
import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.database import SessionLocal
from app.core.websockets import manager, get_ws_user_id
from app.models.all_models import Notification, NotificationPreference, User
from app.core.deps import get_current_user
from app.core.permissions import Permission
from app.services.authorization import user_has_permission
from app.schemas.all_schemas import NotificationPreferenceUpdate
from app.core.security import create_access_token

router = APIRouter(tags=["realtime"])

VALID_TOPICS = {
    "patient_checkin",
    "queue_update",
    "doctor_status",
    "emergency_dispatch",
    "lab_status",
    "pharmacy_status",
    "appointment_status",
    "notifications",
}

TOPIC_PERMISSIONS = {
    "patient_checkin": Permission.appointments_view,
    "queue_update": Permission.appointments_view,
    "doctor_status": Permission.doctors_view,
    "emergency_dispatch": Permission.ambulance_view,
    "lab_status": Permission.laboratory_view,
    "pharmacy_status": Permission.pharmacy_view,
    "appointment_status": Permission.appointments_view,
}


def _notification_snapshot(user_id: int) -> tuple[int, int, bool]:
    """Read notification state in a separate session for the live socket."""
    db = SessionLocal()
    try:
        latest_id = db.query(Notification.id).filter(
            Notification.user_id == user_id,
            Notification.channel == "in_app",
        ).order_by(Notification.id.desc()).limit(1).scalar() or 0
        unread_count = db.query(Notification.id).filter(
            Notification.user_id == user_id,
            Notification.channel == "in_app",
            Notification.status != "read",
        ).count()
        is_active = bool(db.query(User.id).filter(
            User.id == user_id,
            User.is_active.is_(True),
        ).scalar())
        return latest_id, unread_count, is_active
    finally:
        db.close()


def _websocket_token(websocket: WebSocket, query_token: str | None) -> tuple[str | None, str | None]:
    protocols = [item.strip() for item in websocket.headers.get("sec-websocket-protocol", "").split(",")]
    if len(protocols) >= 2 and protocols[0].lower() == "bearer" and protocols[1]:
        return protocols[1], "bearer"
    return query_token, None


@router.websocket("/ws/{topic}")
async def websocket_endpoint(
    websocket: WebSocket,
    topic: str,
    token: str | None = Query(None, description="Deprecated JWT query parameter; use the bearer WebSocket subprotocol"),
):
    """
    Authenticated WebSocket endpoint.
    The client should pass the Bearer subprotocol plus an authenticated token.
    Unauthorised or invalid tokens result in immediate close(4003).
    """
    if topic not in VALID_TOPICS:
        await websocket.close(code=4004, reason="Unknown topic")
        return

    token_value, accepted_subprotocol = _websocket_token(websocket, token)
    try:
        user_id = get_ws_user_id(
            token_value or "",
            required_scope="notifications.websocket" if topic == "notifications" else None,
        )
    except ValueError as exc:
        await websocket.close(code=4003, reason="Unauthorized")
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
        permission = TOPIC_PERMISSIONS.get(topic)
        if not user or (permission and not user_has_permission(user, permission, db)):
            await websocket.close(code=4003, reason="Forbidden")
            return
    finally:
        db.close()

    await manager.connect(websocket, topic, user_id, accepted_subprotocol)
    try:
        if topic == "notifications":
            last_snapshot = await asyncio.to_thread(_notification_snapshot, user_id)
            await websocket.send_json({
                "event": "notifications.ready",
                "latest_id": last_snapshot[0],
                "unread_count": last_snapshot[1],
            })
            while True:
                try:
                    data = await asyncio.wait_for(websocket.receive_text(), timeout=2.0)
                    if data == "ping":
                        await websocket.send_text("pong")
                except asyncio.TimeoutError:
                    snapshot = await asyncio.to_thread(_notification_snapshot, user_id)
                    if not snapshot[2]:
                        await websocket.close(code=4003, reason="Account disabled")
                        return
                    if snapshot != last_snapshot:
                        last_snapshot = snapshot
                        await websocket.send_json({
                            "event": "notifications.changed",
                            "latest_id": snapshot[0],
                            "unread_count": snapshot[1],
                        })
            return
        while True:
            # Keep connection alive; we don't process inbound messages for now
            data = await websocket.receive_text()
            # Ping/pong style keepalive
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, topic)


# ─── Notification REST API ────────────────────────────────────────────────────

@router.post("/notifications/socket-ticket")
def create_notification_socket_ticket(current_user: User = Depends(get_current_user)):
    """Issue a short-lived, notification-only token for browser WebSockets."""
    ticket = create_access_token(
        {
            "sub": str(current_user.id),
            "role": current_user.role,
            "scope": "notifications.websocket",
        },
        expires_delta=timedelta(minutes=2),
    )
    return {"ticket": ticket, "expires_in": 120}


@router.get("/notifications/me", response_model=List[dict])
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    unread_only: bool = False,
):
    """Return in-app notifications for the authenticated user."""
    q = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.channel == "in_app",
    )
    if unread_only:
        q = q.filter(Notification.status != "read")
    notifs = q.order_by(Notification.created_at.desc()).limit(50).all()
    return [
        {
            "id": n.id,
            "type": n.type,
            "subject": n.subject,
            "body": n.body,
            "status": n.status,
            "entity_type": n.entity_type,
            "entity_id": n.entity_id,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]


@router.put("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single in-app notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.status = "read"
    notif.read_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Marked as read"}


@router.put("/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark every unread in-app notification for the current user as read."""
    now = datetime.now(timezone.utc)
    updated = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.channel == "in_app",
        Notification.status != "read",
    ).update(
        {Notification.status: "read", Notification.read_at: now},
        synchronize_session=False,
    )
    db.commit()
    return {"message": "Notifications marked as read", "updated": updated}


@router.get("/notifications/preferences")
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()
    if not prefs:
        # Return defaults
        return {
            "email_enabled": True, "sms_enabled": False, "whatsapp_enabled": False,
            "in_app_enabled": True, "appointment_reminder": True, "prescription_ready": True,
            "lab_result_ready": True, "radiology_report_ready": True, "payment_receipt": True,
            "insurance_status": True, "emergency_dispatch": True,
        }
    return {c.name: getattr(prefs, c.name) for c in NotificationPreference.__table__.columns if c.name not in ("id", "user_id")}


@router.put("/notifications/preferences")
def update_notification_preferences(
    prefs_data: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prefs = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == current_user.id
    ).first()
    if not prefs:
        prefs = NotificationPreference(user_id=current_user.id)
        db.add(prefs)

    for key, value in prefs_data.model_dump(exclude_unset=True).items():
        setattr(prefs, key, value)

    db.commit()
    return {"message": "Preferences updated"}
