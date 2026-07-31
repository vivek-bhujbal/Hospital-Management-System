from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.config import settings
from app.models.all_models import User
from app.schemas.all_schemas import UserResponse

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user

class RoleChecker:
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)):
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted"
            )
        return current_user

class PermissionChecker:
    def __init__(self, required_permission: str):
        self.required_permission = required_permission
        
    def __call__(self, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        if current_user.role == 'admin':
            return current_user # Admins can do anything
            
        if current_user.role != 'receptionist':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for this role"
            )
            
        from app.models.all_models import Employee, EmployeePermission
        
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not emp or emp.status == 'inactive':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employee record not found or inactive"
            )
            
        perms = db.query(EmployeePermission).filter(EmployeePermission.employee_id == emp.id).first()
        if not perms or getattr(perms, self.required_permission, 0) == 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action"
            )
            
        return current_user
