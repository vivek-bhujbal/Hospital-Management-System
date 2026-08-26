from contextvars import ContextVar
from typing import Optional

# Context variables to store request-specific information for audit logging
current_user_id: ContextVar[Optional[int]] = ContextVar("current_user_id", default=None)
current_user_ip: ContextVar[Optional[str]] = ContextVar("current_user_ip", default=None)
current_user_agent: ContextVar[Optional[str]] = ContextVar("current_user_agent", default=None)
