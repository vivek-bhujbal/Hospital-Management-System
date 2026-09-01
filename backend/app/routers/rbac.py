from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.core.roles import UserRole
from app.database import get_db
from app.models.all_models import AuditLog, User
from app.schemas.all_schemas import (
    AuditLogResponse,
    EffectivePermissionsResponse,
    UserResponse,
    UserRoleUpdate,
)
from app.services.audit_service import record_audit_event
from app.services.authorization import get_effective_permissions


router = APIRouter()


@router.get("/me/permissions", response_model=EffectivePermissionsResponse)
def read_my_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "role": current_user.role,
        "permissions": sorted(get_effective_permissions(current_user, db)),
    }


@router.patch("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin)),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Users cannot change their own role",
        )

    new_role = role_update.role.value
    old_role = target.role
    if UserRole.super_admin.value in {old_role, new_role}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The environment-owned Super Admin role cannot be assigned or removed via API",
        )
    if old_role == new_role:
        return target

    target.role = new_role
    record_audit_event(
        db,
        actor=current_user,
        action="user.role.updated",
        resource_type="user",
        resource_id=str(target.id),
        old_values={"role": old_role},
        new_values={"role": new_role},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.commit()
    db.refresh(target)
    return target


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def list_audit_logs(
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.super_admin)),
):
    return (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
