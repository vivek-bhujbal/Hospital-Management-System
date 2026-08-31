from fastapi import APIRouter, Depends, HTTPException, status, Body
from app.core.deps import get_current_user, is_user_access_active
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.schemas.all_schemas import UserCreate, UserResponse, RoleEnum, PatientRegister, EmployeePermissionResponse, GenderEnum
from app.models.all_models import User, Patient, Doctor, Employee, EmployeePermission
from app.core.security import get_password_hash, verify_password, create_access_token, validate_password_strength
from app.core.config import settings
from app.services.authorization import get_effective_permissions
from app.services.email_service import send_verification_email, send_password_reset_email
from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional
import secrets
import hashlib
from datetime import datetime, timedelta, timezone

router = APIRouter()

FRONTEND_URL = settings.FRONTEND_URL


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    permissions: Optional[EmployeePermissionResponse] = None
    effective_permissions: List[str]
    expires_in: int

class VerifyEmailRequest(BaseModel):
    token: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    _validate_password = field_validator('new_password')(validate_password_strength)

def generate_token():
    return secrets.token_urlsafe(32)

def hash_token(token: str):
    return hashlib.sha256(token.encode()).hexdigest()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: PatientRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        if user.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists. Please login."
            )
        else:
            # Resend verification if account exists but not verified
            token = generate_token()
            user.email_verification_token_hash = hash_token(token)
            user.email_verification_expires_at = utcnow() + timedelta(hours=24)
            db.commit()
            
            verification_link = f"{FRONTEND_URL}/verify-email?token={token}"
            send_verification_email(user.email, user.name, verification_link)
            
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Your email is not verified. A new verification email has been sent."
            )
    
    # Hash the password
    hashed_password = get_password_hash(user_in.password)
    
    # Generate verification token
    token = generate_token()
    token_hash = hash_token(token)
    expires_at = utcnow() + timedelta(hours=24)
    
    # Create User (force role to patient)
    new_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hashed_password,
        role=RoleEnum.patient,
        is_active=True,
        is_email_verified=False,
        email_verification_token_hash=token_hash,
        email_verification_expires_at=expires_at
    )
    db.add(new_user)
    try:
        db.flush()
        new_profile = Patient(
            user_id=new_user.id,
            name=new_user.name,
            contact=user_in.contact,
            gender=user_in.gender,
            age=user_in.age,
            blood_group=user_in.blood_group,
        )
        db.add(new_profile)
        db.commit()
        db.refresh(new_user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration could not be completed",
        )
    
    # Send verification email
    verification_link = f"{FRONTEND_URL}/verify-email?token={token}"
    send_verification_email(new_user.email, new_user.name, verification_link)
    
    return new_user

@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    if not is_user_access_active(user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled."
        )
        
    if not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in."
        )
        
    # Update last login
    user.last_login_at = utcnow()
    db.commit()
    
    # Create JWT Token
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role, "email": user.email})
    
    permissions = None
    if user.role == "receptionist":
        emp = db.query(Employee).filter(Employee.user_id == user.id).first()
        if emp:
            perms = db.query(EmployeePermission).filter(EmployeePermission.employee_id == emp.id).first()
            if perms:
                permissions = perms
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role,
        "permissions": permissions,
        "effective_permissions": sorted(get_effective_permissions(user, db)),
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }
@router.post("/verify-email")
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    token_hash = hash_token(data.token)
    user = db.query(User).filter(User.email_verification_token_hash == token_hash).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
        
    if user.email_verification_expires_at and user.email_verification_expires_at < utcnow():
        raise HTTPException(status_code=410, detail="Your verification link has expired.")
        
    user.is_email_verified = True
    user.email_verified_at = utcnow()
    user.email_verification_token_hash = None
    user.email_verification_expires_at = None
    db.commit()
    
    return {"message": "Email verified successfully!"}

@router.post("/resend-verification")
def resend_verification(data: ResendVerificationRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user:
        # Silently succeed to prevent email enumeration
        return {"message": "If your account exists, a verification email has been sent."}
        
    if user.is_email_verified:
        raise HTTPException(status_code=400, detail="Email is already verified. Please login.")
        
    token = generate_token()
    user.email_verification_token_hash = hash_token(token)
    user.email_verification_expires_at = utcnow() + timedelta(hours=24)
    db.commit()
    
    verification_link = f"{FRONTEND_URL}/verify-email?token={token}"
    send_verification_email(user.email, user.name, verification_link)
    
    return {"message": "A new verification email has been sent."}

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    
    if not user:
        # Silently succeed to prevent email enumeration
        return {"message": "If an account with that email exists, we have sent a password reset link."}
        
    token = generate_token()
    user.password_reset_token_hash = hash_token(token)
    user.password_reset_expires_at = utcnow() + timedelta(hours=1)
    db.commit()
    
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    send_password_reset_email(user.email, user.name, reset_link)
    
    return {"message": "If an account with that email exists, we have sent a password reset link."}

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = hash_token(data.token)
    user = db.query(User).filter(User.password_reset_token_hash == token_hash).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid password reset token")
        
    if user.password_reset_expires_at and user.password_reset_expires_at < utcnow():
        raise HTTPException(status_code=410, detail="Your password reset link has expired.")
        
    user.password_hash = get_password_hash(data.new_password)
    user.password_reset_token_hash = None
    user.password_reset_expires_at = None
    db.commit()
    
    return {"message": "Password reset successfully."}

@router.get('/me')
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {
        'id': current_user.id,
        'email': current_user.email,
        'name': current_user.name,
        'role': current_user.role,
        'is_active': current_user.is_active,
        'effective_permissions': sorted(get_effective_permissions(current_user, db)),
    }
