from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.core.deps import require_permission, require_role
from app.core.permissions import Permission
from app.core.roles import UserRole
from app.core.security import get_password_hash, validate_password_strength
from app.database import get_db
from app.models.all_models import AuditLog, FeatureFlag, Organization, RolePermission, SystemSetting, User
from app.schemas.all_schemas import (
    AdminPasswordReset,
    AuditLogResponse, FeatureFlagCreate, FeatureFlagResponse, FeatureFlagUpdate,
    OrganizationCreate, OrganizationResponse, OrganizationUpdate,
    RolePermissionCreate, RolePermissionResponse,
    StaffAccountResponse,
    SystemSettingCreate, SystemSettingResponse, SystemSettingUpdate,
)
from app.services.audit_service import record_audit_event, request_audit_metadata


router = APIRouter(
    prefix="/super-admin",
    tags=["super_admin"],
    dependencies=[Depends(require_role(UserRole.super_admin))],
)

ADMINISTRATIVE_ONLY_PERMISSIONS = {
    Permission.staff_manage_roles.value, Permission.staff_create.value,
    Permission.staff_update.value, Permission.staff_deactivate.value,
    Permission.settings_manage.value, Permission.organizations_manage.value,
    Permission.features_manage.value, Permission.notifications_manage.value,
}
ADMINISTRATIVE_ROLES = {
    UserRole.super_admin.value, UserRole.admin.value, UserRole.hospital_manager.value,
}


class AdminCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    email: EmailStr
    password: str

    _validate_password = field_validator("password")(validate_password_strength)


def _system_health(db: Session):
    database_status = "unavailable"
    try:
        db.execute(text("SELECT 1"))
        database_status = "available"
    except Exception:
        db.rollback()

    redis_status = "unavailable"
    try:
        from redis import Redis
        from app.core.config import settings

        client = Redis.from_url(
            settings.CELERY_BROKER_URL,
            socket_connect_timeout=0.5,
            socket_timeout=0.5,
        )
        redis_status = "available" if client.ping() else "unavailable"
    except Exception:
        redis_status = "unavailable"

    return {
        "backend": "available",
        "database": database_status,
        "redis": redis_status,
        "checked_at": datetime.now(timezone.utc),
    }


@router.get("/overview")
def get_platform_overview(db: Session = Depends(get_db)):
    recent_activity = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .limit(8)
        .all()
    )
    return {
        "total_organizations": db.query(func.count(Organization.id)).scalar() or 0,
        "total_admins": db.query(func.count(User.id)).filter(User.role == UserRole.admin.value).scalar() or 0,
        "active_admins": db.query(func.count(User.id)).filter(
            User.role == UserRole.admin.value,
            User.is_active.is_(True),
        ).scalar() or 0,
        "total_users": db.query(func.count(User.id)).scalar() or 0,
        "role_permission_grants": db.query(func.count(RolePermission.id)).scalar() or 0,
        "system_settings": db.query(func.count(SystemSetting.id)).scalar() or 0,
        "feature_flags": db.query(func.count(FeatureFlag.id)).scalar() or 0,
        "recent_activity": recent_activity,
        "health": _system_health(db),
    }


@router.get("/settings", response_model=List[SystemSettingResponse])
def get_system_settings(db: Session = Depends(get_db)):
    return db.query(SystemSetting).order_by(SystemSetting.setting_key).all()


@router.post("/settings", response_model=SystemSettingResponse, status_code=201)
def create_system_setting(
    setting: SystemSettingCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.settings_manage)),
):
    if db.query(SystemSetting).filter(SystemSetting.setting_key == setting.setting_key).first():
        raise HTTPException(status_code=409, detail="Setting already exists")
    item = SystemSetting(**setting.model_dump(), updated_by=current_user.id)
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="system_setting.created",
        resource_type="system_setting", resource_id=str(item.id),
        new_values={"setting_key": item.setting_key}, **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.put("/settings/{setting_id}", response_model=SystemSettingResponse)
def update_system_setting(
    setting_id: int, setting: SystemSettingUpdate, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.settings_manage)),
):
    item = db.get(SystemSetting, setting_id)
    if not item:
        raise HTTPException(status_code=404, detail="Setting not found")
    changes = setting.model_dump(exclude_unset=True)
    old_values = {key: getattr(item, key) for key in changes}
    for key, value in changes.items():
        setattr(item, key, value)
    item.updated_by = current_user.id
    record_audit_event(
        db, actor=current_user, action="system_setting.updated",
        resource_type="system_setting", resource_id=str(setting_id),
        old_values=old_values, new_values=changes, **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/hospitals", response_model=List[OrganizationResponse])
def get_organizations(db: Session = Depends(get_db)):
    return db.query(Organization).order_by(Organization.name).all()


@router.post("/hospitals", response_model=OrganizationResponse, status_code=201)
def create_organization(
    org: OrganizationCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.organizations_manage)),
):
    item = Organization(**org.model_dump())
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="organization.created", resource_type="organization",
        resource_id=str(item.id), new_values=org.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.put("/hospitals/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: int, org: OrganizationUpdate, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.organizations_manage)),
):
    item = db.get(Organization, org_id)
    if not item:
        raise HTTPException(status_code=404, detail="Organization not found")
    changes = org.model_dump(exclude_unset=True)
    old_values = {key: getattr(item, key) for key in changes}
    for key, value in changes.items():
        setattr(item, key, value)
    record_audit_event(
        db, actor=current_user, action="organization.updated", resource_type="organization",
        resource_id=str(org_id), old_values=old_values, new_values=changes,
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/roles-permissions", response_model=List[RolePermissionResponse])
def list_role_permission_grants(db: Session = Depends(get_db)):
    return db.query(RolePermission).order_by(RolePermission.role, RolePermission.permission).all()


@router.post("/roles-permissions", response_model=RolePermissionResponse, status_code=201)
def create_role_permission(
    grant: RolePermissionCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.staff_manage_roles)),
):
    role, permission = grant.role.value, grant.permission.value
    if permission in ADMINISTRATIVE_ONLY_PERMISSIONS and role not in ADMINISTRATIVE_ROLES:
        raise HTTPException(status_code=400, detail="Administrative permissions cannot be granted to operational roles")
    if db.query(RolePermission).filter_by(role=role, permission=permission).first():
        raise HTTPException(status_code=409, detail="Permission already granted to role")
    item = RolePermission(
        role=role, permission=permission, description=grant.description,
        created_by=current_user.id,
    )
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="role_permission.granted",
        resource_type="role_permission", resource_id=str(item.id),
        new_values={"role": role, "permission": permission},
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.delete("/roles-permissions/{grant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role_permission(
    grant_id: int, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.staff_manage_roles)),
):
    item = db.get(RolePermission, grant_id)
    if not item:
        raise HTTPException(status_code=404, detail="Role permission grant not found")
    old_values = {"role": item.role, "permission": item.permission}
    db.delete(item)
    record_audit_event(
        db, actor=current_user, action="role_permission.revoked",
        resource_type="role_permission", resource_id=str(grant_id),
        old_values=old_values, **request_audit_metadata(request),
    )
    db.commit()


@router.get("/features", response_model=List[FeatureFlagResponse])
def get_feature_flags(db: Session = Depends(get_db)):
    return db.query(FeatureFlag).order_by(FeatureFlag.feature_name).all()


@router.post("/features", response_model=FeatureFlagResponse, status_code=201)
def create_feature_flag(
    flag: FeatureFlagCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.features_manage)),
):
    if db.query(FeatureFlag).filter_by(feature_name=flag.feature_name).first():
        raise HTTPException(status_code=409, detail="Feature flag already exists")
    item = FeatureFlag(**flag.model_dump(), updated_by=current_user.id)
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="feature_flag.created", resource_type="feature_flag",
        resource_id=str(item.id), new_values=flag.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.put("/features/{flag_id}", response_model=FeatureFlagResponse)
def update_feature_flag(
    flag_id: int, flag: FeatureFlagUpdate, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.features_manage)),
):
    item = db.get(FeatureFlag, flag_id)
    if not item:
        raise HTTPException(status_code=404, detail="Feature flag not found")
    changes = flag.model_dump(exclude_unset=True)
    old_values = {key: getattr(item, key) for key in changes}
    for key, value in changes.items():
        setattr(item, key, value)
    item.updated_by = current_user.id
    record_audit_event(
        db, actor=current_user, action="feature_flag.updated", resource_type="feature_flag",
        resource_id=str(flag_id), old_values=old_values, new_values=changes,
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    db: Session = Depends(get_db), limit: int = Query(100, ge=1, le=200),
    skip: int = Query(0, ge=0),
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/admins", response_model=StaffAccountResponse, status_code=201)
def create_admin(
    admin_in: AdminCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.staff_manage_roles)),
):
    if db.query(User).filter(User.email == admin_in.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    item = User(
        name=admin_in.name.strip(), email=str(admin_in.email).lower(),
        password_hash=get_password_hash(admin_in.password), role=UserRole.admin.value,
        is_active=True, is_email_verified=True,
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="admin.created", resource_type="user",
        resource_id=str(item.id), new_values={"email": item.email, "role": item.role},
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return {
        "id": item.id, "name": item.name, "email": item.email,
        "role": item.role, "is_active": item.is_active,
        "profile_id": None, "created_at": item.created_at,
    }


@router.get("/admins", response_model=List[StaffAccountResponse])
def get_admins(db: Session = Depends(get_db)):
    items = db.query(User).filter(User.role == UserRole.admin.value).order_by(User.name).all()
    return [
        {
            "id": item.id, "name": item.name, "email": item.email,
            "role": item.role, "is_active": item.is_active,
            "profile_id": None, "created_at": item.created_at,
        }
        for item in items
    ]


@router.get("/users", response_model=List[StaffAccountResponse])
def get_system_users(db: Session = Depends(get_db)):
    """List safe account metadata for every system user."""
    items = db.query(User).order_by(User.created_at.desc(), User.id.desc()).all()
    return [
        {
            "id": item.id,
            "name": item.name,
            "email": item.email,
            "role": item.role,
            "is_active": item.is_active,
            "profile_id": None,
            "created_at": item.created_at,
        }
        for item in items
    ]


@router.get("/admins/{admin_id}", response_model=StaffAccountResponse)
def get_admin(admin_id: int, db: Session = Depends(get_db)):
    item = db.query(User).filter(
        User.id == admin_id,
        User.role == UserRole.admin.value,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Admin not found")
    return {
        "id": item.id,
        "name": item.name,
        "email": item.email,
        "role": item.role,
        "is_active": item.is_active,
        "profile_id": None,
        "created_at": item.created_at,
    }


@router.patch("/admins/{admin_id}/reset-password")
def reset_admin_password(
    admin_id: int,
    reset_in: AdminPasswordReset,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.staff_manage_roles)),
):
    item = db.query(User).filter(
        User.id == admin_id,
        User.role == UserRole.admin.value,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Admin not found")

    item.password_hash = get_password_hash(reset_in.new_password)
    item.password_reset_token_hash = None
    item.password_reset_expires_at = None
    record_audit_event(
        db,
        actor=current_user,
        action="admin.password_reset",
        resource_type="user",
        resource_id=str(item.id),
        new_values={"target_user_id": item.id},
        **request_audit_metadata(request),
    )
    db.commit()
    return {"status": "success", "message": "Administrator password reset successfully"}


def _set_admin_active(admin_id: int, active: bool, request: Request, db: Session, current_user: User):
    item = db.query(User).filter(User.id == admin_id, User.role == UserRole.admin.value).first()
    if not item:
        raise HTTPException(status_code=404, detail="Admin not found")
    if item.is_active == active:
        return {"status": "active" if active else "deactivated"}
    old_value = item.is_active
    item.is_active = active
    record_audit_event(
        db, actor=current_user, action="admin.activated" if active else "admin.deactivated",
        resource_type="user", resource_id=str(item.id), old_values={"is_active": old_value},
        new_values={"is_active": active}, **request_audit_metadata(request),
    )
    db.commit()
    return {"status": "active" if active else "deactivated"}


@router.put("/admins/{admin_id}/deactivate")
def deactivate_admin(
    admin_id: int, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.staff_manage_roles)),
):
    return _set_admin_active(admin_id, False, request, db, current_user)


@router.put("/admins/{admin_id}/activate")
def activate_admin(
    admin_id: int, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.staff_manage_roles)),
):
    return _set_admin_active(admin_id, True, request, db, current_user)


@router.get("/system-health")
def get_system_health(db: Session = Depends(get_db)):
    return _system_health(db)
