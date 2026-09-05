import pytest
from jose import jwt

from app.core.config import settings
from app.core.websockets import get_ws_user_id
from app.models.all_models import Notification


def headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_notification_ticket_and_read_actions_are_user_scoped(
    client, db, create_user, login
):
    user = create_user("nurse")
    other = create_user("doctor")
    own = Notification(
        user_id=user.id,
        type="nursing_task.assigned",
        channel="in_app",
        subject="New task",
        body="A task was assigned.",
        status="sent",
        idempotency_key="own-notification",
    )
    foreign = Notification(
        user_id=other.id,
        type="appointment.created",
        channel="in_app",
        subject="New appointment",
        body="A patient booked an appointment.",
        status="sent",
        idempotency_key="foreign-notification",
    )
    db.add_all([own, foreign])
    db.commit()
    auth = headers(login(user))

    response = client.get("/notifications/me", headers=auth)
    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [own.id]

    ticket_response = client.post("/notifications/socket-ticket", headers=auth)
    assert ticket_response.status_code == 200
    claims = jwt.decode(
        ticket_response.json()["ticket"],
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
    )
    assert claims["sub"] == str(user.id)
    assert claims["scope"] == "notifications.websocket"
    assert "exp" in claims
    assert get_ws_user_id(
        ticket_response.json()["ticket"],
        required_scope="notifications.websocket",
    ) == user.id
    with pytest.raises(ValueError):
        get_ws_user_id(ticket_response.json()["ticket"])

    assert client.put(f"/notifications/{foreign.id}/read", headers=auth).status_code == 404
    marked = client.put("/notifications/read-all", headers=auth)
    assert marked.status_code == 200
    assert marked.json()["updated"] == 1
    db.refresh(own)
    db.refresh(foreign)
    assert own.status == "read"
    assert foreign.status == "sent"
