import math
import random
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Employee, Department, JobPosition
from schemas import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse,
    EmployeeListResponse, PaginationMeta
)

router = APIRouter(prefix="/api/employees", tags=["Employees"])

AVATAR_COLORS = [
    "#714B67", "#00A09D", "#4A90A4", "#D97706", "#059669",
    "#7C3AED", "#DC2626", "#EC4899", "#0891B2", "#8B5CF6",
    "#2563EB", "#F59E0B", "#6366F1", "#14B8A6", "#E11D48",
]


def _employee_to_response(emp: Employee) -> EmployeeResponse:
    return EmployeeResponse(
        id=emp.id,
        name=emp.name,
        email=emp.email,
        phone=emp.phone,
        department_id=emp.department_id,
        job_position_id=emp.job_position_id,
        company=emp.company,
        work_address=emp.work_address,
        work_email=emp.work_email,
        work_phone=emp.work_phone,
        hire_date=emp.hire_date,
        status=emp.status,
        avatar_color=emp.avatar_color,
        role=emp.role or "staff",
        manager_id=emp.manager_id,
        department_name=emp.department.name if emp.department else None,
        job_position_name=emp.job_position.name if emp.job_position else None,
        manager_name=emp.manager.name if emp.manager else None,
        created_at=emp.created_at,
        updated_at=emp.updated_at,
    )


@router.get("", response_model=EmployeeListResponse)
def list_employees(
    search: str = Query(None),
    department_id: int = Query(None),
    status: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=5000),
    db: Session = Depends(get_db),
):
    query = db.query(Employee)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (Employee.name.ilike(pattern))
            | (Employee.email.ilike(pattern))
            | (Employee.work_email.ilike(pattern))
        )
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    if status:
        query = query.filter(Employee.status == status)

    total = query.count()
    employees = (
        query.order_by(Employee.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return EmployeeListResponse(
        data=[_employee_to_response(e) for e in employees],
        pagination=PaginationMeta(
            page=page,
            limit=limit,
            total=total,
            total_pages=math.ceil(total / limit) if total > 0 else 1,
        ),
    )


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return _employee_to_response(emp)


@router.post("", response_model=EmployeeResponse, status_code=201)
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db)):
    emp = Employee(
        name=data.name,
        email=data.email,
        phone=data.phone,
        department_id=data.department_id,
        job_position_id=data.job_position_id,
        company=data.company,
        work_address=data.work_address,
        work_email=data.work_email,
        work_phone=data.work_phone,
        hire_date=data.hire_date,
        status=data.status,
        avatar_color=data.avatar_color or random.choice(AVATAR_COLORS),
        role=data.role or "staff",
        manager_id=data.manager_id,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return _employee_to_response(emp)


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(employee_id: int, data: EmployeeUpdate, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(emp, key, value)

    db.commit()
    db.refresh(emp)
    return _employee_to_response(emp)


@router.delete("/{employee_id}")
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(emp)
    db.commit()
    return {"message": "Employee deleted successfully"}
