from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.all_models import Employee, EmployeePermission, User
from app.schemas.all_schemas import EmployeeCreate, EmployeeResponse, EmployeeUpdate, EmployeePermissionUpdate, EmployeePermissionResponse, UserCreate
from typing import List
from app.core.deps import get_current_user, RoleChecker
from passlib.context import CryptContext

router = APIRouter()
allow_admin = RoleChecker(["admin"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.get("/", response_model=List[EmployeeResponse])
def get_employees(db: Session = Depends(get_db), current_user: User = Depends(allow_admin)):
    employees = db.query(Employee).all()
    for emp in employees:
        user = db.query(User).filter(User.id == emp.user_id).first()
        if user:
            emp.name = user.name
            emp.email = user.email
    return employees

@router.post("/", response_model=EmployeeResponse)
def create_employee(emp_in: EmployeeCreate, db: Session = Depends(get_db), current_user: User = Depends(allow_admin)):
    # Check if email exists
    if db.query(User).filter(User.email == emp_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 1. Create User
    new_user = User(
        name=emp_in.name,
        email=emp_in.email,
        password_hash=pwd_context.hash(emp_in.password),
        role='receptionist'
    )
    db.add(new_user)
    db.flush() # get user ID

    # 2. Create Employee
    new_emp = Employee(
        user_id=new_user.id,
        designation=emp_in.designation,
        joining_date=emp_in.joining_date,
        shift_start=emp_in.shift_start,
        shift_end=emp_in.shift_end,
        status=emp_in.status.value if emp_in.status else 'active',
        added_by=current_user.id
    )
    db.add(new_emp)
    db.flush() # get employee ID

    # 3. Create Default Permissions
    default_perms = EmployeePermission(
        employee_id=new_emp.id,
        can_register_patient=1,
        can_schedule_appointment=1,
        can_checkin_patient=1,
        can_collect_billing=1,
        can_view_reports=0
    )
    db.add(default_perms)
    
    db.commit()
    db.refresh(new_emp)
    
    # attach relations for response if needed
    new_emp.permissions = default_perms
    new_emp.name = new_user.name
    new_emp.email = new_user.email
    return new_emp

@router.patch("/{id}", response_model=EmployeeResponse)
def update_employee(id: int, emp_update: EmployeeUpdate, db: Session = Depends(get_db), current_user: User = Depends(allow_admin)):
    emp = db.query(Employee).filter(Employee.id == id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    update_data = emp_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key == 'status' and value:
            setattr(emp, key, value.value)
        else:
            setattr(emp, key, value)
            
    db.commit()
    db.refresh(emp)
    
    user = db.query(User).filter(User.id == emp.user_id).first()
    if user:
        emp.name = user.name
        emp.email = user.email
    
    # load permissions
    emp.permissions = db.query(EmployeePermission).filter(EmployeePermission.employee_id == emp.id).first()
        
    return emp

@router.delete("/{id}")
def delete_employee(id: int, db: Session = Depends(get_db), current_user: User = Depends(allow_admin)):
    emp = db.query(Employee).filter(Employee.id == id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Soft delete
    emp.status = 'inactive'
    db.commit()
    return {"status": "deactivated"}

@router.patch("/{id}/permissions", response_model=EmployeePermissionResponse)
def update_permissions(id: int, perms_update: EmployeePermissionUpdate, db: Session = Depends(get_db), current_user: User = Depends(allow_admin)):
    emp = db.query(Employee).filter(Employee.id == id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    perms = db.query(EmployeePermission).filter(EmployeePermission.employee_id == emp.id).first()
    if not perms:
        raise HTTPException(status_code=404, detail="Permissions not found")
        
    update_data = perms_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(perms, key, 1 if value else 0)
        
    db.commit()
    db.refresh(perms)
    return perms
