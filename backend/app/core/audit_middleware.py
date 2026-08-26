from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.core.context import current_user_id, current_user_ip, current_user_agent


class AuditContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware that populates thread-local context variables so that the
    SQLAlchemy audit event listeners can capture who performed each change,
    from which IP, and with which user-agent — without needing to pass those
    values explicitly through every function call.
    """

    async def dispatch(self, request: Request, call_next):
        # Resolve IP (respect X-Forwarded-For if behind a proxy)
        forwarded_for = request.headers.get("X-Forwarded-For")
        ip = forwarded_for.split(",")[0].strip() if forwarded_for else (
            request.client.host if request.client else None
        )
        ua = request.headers.get("User-Agent")

        # Try to extract user_id from the Authorization header without
        # raising errors (best-effort; unauthenticated requests get None)
        user_id = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                from jose import jwt, JWTError
                from app.core.config import settings
                token = auth_header.split(" ", 1)[1]
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                user_id = payload.get("sub")
                if user_id:
                    user_id = int(user_id)
            except Exception:
                pass

        # Set context vars for the duration of this request
        t_uid = current_user_id.set(user_id)
        t_ip = current_user_ip.set(ip)
        t_ua = current_user_agent.set(ua)

        try:
            response = await call_next(request)
        finally:
            current_user_id.reset(t_uid)
            current_user_ip.reset(t_ip)
            current_user_agent.reset(t_ua)

        return response
