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
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone

from app.database import get_db
from app.database import SessionLocal
from app.core.websockets import manager, get_ws_user_id
from app.models.all_models import Notification, NotificationPreference, User
from app.core.deps import get_current_user
from app.core.permissions import Permission
from app.services.authorization import user_has_permission
from app.schemas.all_schemas import NotificationPreferenceUpdate

router = APIRouter(tags=["realtime"])

VALID_TOPICS = {
    "patient_checkin",
    "queue_update",
    "doctor_status",
    "emergency_dispatch",
    "lab_status",
    "pharmacy_status",
    "appointment_status",
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
    The client must pass ?token=<jwt> on connection.
    Unauthorised or invalid tokens result in immediate close(4003).
    """
    if topic not in VALID_TOPICS:
        await websocket.close(code=4004, reason="Unknown topic")
        return

    token_value, accepted_subprotocol = _websocket_token(websocket, token)
    try:
        user_id = get_ws_user_id(token_value or "")
    except ValueError as exc:
        await websocket.close(code=4003, reason="Unauthorized")
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
        if not user or not user_has_permission(user, TOPIC_PERMISSIONS[topic], db):
            await websocket.close(code=4003, reason="Forbidden")
            return
    finally:
        db.close()

    await manager.connect(websocket, topic, user_id, accepted_subprotocol)
    try:
        while True:
            # Keep connection alive; we don't process inbound messages for now
            data = await websocket.receive_text()
            # Ping/pong style keepalive
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, topic)


# ─── Notification REST API ────────────────────────────────────────────────────

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
