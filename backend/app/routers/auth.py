from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.all_schemas import UserCreate, UserResponse, RoleEnum, PatientCreate, DoctorCreate, EmployeePermissionResponse
from app.models.all_models import User, Patient, Doctor, Employee, EmployeePermission
from app.core.security import get_password_hash, verify_password, create_access_token
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    permissions: Optional[EmployeePermissionResponse] = None

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash the password
    hashed_password = get_password_hash(user_in.password)
    
    # Create User
    new_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hashed_password,
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create associated profile record based on role
    if user_in.role == RoleEnum.patient:
        new_profile = Patient(user_id=new_user.id, name=new_user.name)
        db.add(new_profile)
    elif user_in.role == RoleEnum.doctor:
        new_profile = Doctor(user_id=new_user.id, name=new_user.name)
        db.add(new_profile)
    # Admin creates receptionists via /admin/employees

    db.commit()
    
    return new_user

@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create JWT Token
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
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
        "permissions": permissions
    }
