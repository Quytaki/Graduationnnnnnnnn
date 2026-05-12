from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Department, Employee
from schemas import DepartmentCreate, DepartmentUpdate, DepartmentResponse

router = APIRouter(prefix="/api/departments", tags=["Departments"])


def _department_to_response(dept: Department, db: Session) -> DepartmentResponse:
    count = db.query(Employee).filter(Employee.department_id == dept.id).count()
    return DepartmentResponse(
        id=dept.id,
        name=dept.name,
        company=dept.company,
        description=dept.description,
        color=dept.color,
        employee_count=count,
        created_at=dept.created_at,
        updated_at=dept.updated_at,
    )


@router.get("", response_model=list[DepartmentResponse])
def list_departments(db: Session = Depends(get_db)):
    departments = db.query(Department).order_by(Department.name).all()
    return [_department_to_response(d, db) for d in departments]


@router.get("/{department_id}", response_model=DepartmentResponse)
def get_department(department_id: int, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return _department_to_response(dept, db)


@router.post("", response_model=DepartmentResponse, status_code=201)
def create_department(data: DepartmentCreate, db: Session = Depends(get_db)):
    dept = Department(
        name=data.name,
        company=data.company,
        description=data.description,
        color=data.color,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return _department_to_response(dept, db)


@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(department_id: int, data: DepartmentUpdate, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dept, key, value)

    db.commit()
    db.refresh(dept)
    return _department_to_response(dept, db)


@router.delete("/{department_id}")
def delete_department(department_id: int, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(dept)
    db.commit()
    return {"message": "Department deleted successfully"}
