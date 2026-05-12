import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import WorkingHour, Employee
from schemas import (
    WorkingHourCreate, WorkingHourUpdate, WorkingHourResponse,
    WorkingHourListResponse, PaginationMeta
)

router = APIRouter(prefix="/api/working-hours", tags=["Working Hours"])


def _wh_to_response(wh: WorkingHour) -> WorkingHourResponse:
    return WorkingHourResponse(
        id=wh.id,
        employee_id=wh.employee_id,
        period=wh.period,
        standard_hours=float(wh.standard_hours or 0),
        actual_hours=float(wh.actual_hours or 0),
        overtime_hours=float(wh.overtime_hours or 0),
        late_hours=float(wh.late_hours or 0),
        absent_days=float(wh.absent_days or 0),
        working_days=float(wh.working_days or 0),
        notes=wh.notes,
        employee_name=wh.employee.name if wh.employee else None,
        created_at=wh.created_at,
        updated_at=wh.updated_at,
    )


@router.get("", response_model=WorkingHourListResponse)
def list_working_hours(
    search: str = Query(None),
    employee_id: int = Query(None),
    period: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(WorkingHour)
    if search:
        query = query.join(Employee).filter(Employee.name.ilike(f"%{search}%"))
    if employee_id:
        query = query.filter(WorkingHour.employee_id == employee_id)
    if period:
        query = query.filter(WorkingHour.period == period)

    total = query.count()
    items = query.order_by(WorkingHour.id.desc()).offset((page - 1) * limit).limit(limit).all()

    return WorkingHourListResponse(
        data=[_wh_to_response(wh) for wh in items],
        pagination=PaginationMeta(
            page=page, limit=limit, total=total,
            total_pages=math.ceil(total / limit) if total > 0 else 1,
        ),
    )


@router.get("/{wh_id}", response_model=WorkingHourResponse)
def get_working_hour(wh_id: int, db: Session = Depends(get_db)):
    wh = db.query(WorkingHour).filter(WorkingHour.id == wh_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Working hour record not found")
    return _wh_to_response(wh)


@router.post("", response_model=WorkingHourResponse, status_code=201)
def create_working_hour(data: WorkingHourCreate, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=400, detail="Employee not found")
    wh = WorkingHour(**data.model_dump())
    db.add(wh)
    db.commit()
    db.refresh(wh)
    return _wh_to_response(wh)


@router.put("/{wh_id}", response_model=WorkingHourResponse)
def update_working_hour(wh_id: int, data: WorkingHourUpdate, db: Session = Depends(get_db)):
    wh = db.query(WorkingHour).filter(WorkingHour.id == wh_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Working hour record not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(wh, key, value)
    db.commit()
    db.refresh(wh)
    return _wh_to_response(wh)


@router.delete("/{wh_id}")
def delete_working_hour(wh_id: int, db: Session = Depends(get_db)):
    wh = db.query(WorkingHour).filter(WorkingHour.id == wh_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Working hour record not found")
    db.delete(wh)
    db.commit()
    return {"message": "Working hour record deleted"}
