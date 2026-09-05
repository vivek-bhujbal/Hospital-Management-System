"""
Centralized WebSocket Connection Manager.

Design decisions:
- Connections support the Bearer WebSocket subprotocol; the notification UI
  uses a short-lived, notification-only JWT instead of exposing the login JWT.
- Disconnected clients are silently removed from the registry.
- Topics isolate connection groups: each role / module that needs real-time
  events subscribes to a topic (e.g. "emergency_dispatch", "queue").
- Broadcasting is async-safe and catches per-client send failures without
  crashing the manager.
"""
import logging
from typing import Dict, Set
from fastapi import WebSocket, WebSocketDisconnect, status

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # topic -> set of (user_id, websocket) pairs
        self._connections: Dict[str, Set[tuple]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        topic: str,
        user_id: int,
        subprotocol: str | None = None,
    ):
        await websocket.accept(subprotocol=subprotocol)
        if topic not in self._connections:
            self._connections[topic] = set()
        self._connections[topic].add((user_id, websocket))
        logger.info(f"WS connected: user={user_id} topic={topic}")

    def disconnect(self, websocket: WebSocket, topic: str):
        conns = self._connections.get(topic, set())
        self._connections[topic] = {(uid, ws) for uid, ws in conns if ws is not websocket}
        logger.info(f"WS disconnected: topic={topic}")

    async def broadcast(self, topic: str, payload: dict):
        """Send a JSON payload to all subscribers of a topic."""
        dead = set()
        for uid, ws in list(self._connections.get(topic, set())):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add((uid, ws))
        # Purge dead connections
        if dead:
            self._connections[topic] = self._connections.get(topic, set()) - dead

    async def send_to_user(self, topic: str, user_id: int, payload: dict):
        """Send a JSON payload to a specific user on a topic."""
        for uid, ws in list(self._connections.get(topic, set())):
            if uid == user_id:
                try:
                    await ws.send_json(payload)
                except Exception:
                    self.disconnect(ws, topic)


# Singleton instance used across the application
manager = ConnectionManager()


def get_ws_user_id(token: str, required_scope: str | None = None) -> int:
    """
    Decode a JWT token and return the user ID.
    Raises ValueError if the token is invalid or missing.
    Passwords, refresh tokens, and secrets are never touched here.
    """
    from jose import jwt, JWTError
    from app.core.config import settings

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_scope = payload.get("scope")
        if required_scope and token_scope != required_scope:
            raise ValueError("Token has an invalid WebSocket scope")
        if not required_scope and token_scope:
            raise ValueError("Scoped token cannot access this WebSocket topic")
        user_id = payload.get("sub")
        if user_id is None:
            raise ValueError("Token missing 'sub' claim")
        return int(user_id)
    except (JWTError, TypeError, ValueError) as exc:
        raise ValueError("Invalid access token") from exc
