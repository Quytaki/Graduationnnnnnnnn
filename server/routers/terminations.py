import math
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import Termination, Employee, User
from schemas import (
    TerminationCreate, TerminationUpdate, TerminationResponse,
    TerminationListResponse, PaginationMeta
)
from services.business_rules import execute_termination_completion

router = APIRouter(prefix="/api/terminations", tags=["Terminations"])


def _termination_to_response(t: Termination) -> TerminationResponse:
    return TerminationResponse(
        id=t.id,
        employee_id=t.employee_id,
        termination_date=t.termination_date,
        reason=t.reason,
        description=t.description,
        notice_date=t.notice_date,
        last_working_day=t.last_working_day,
        status=t.status,
        employee_name=t.employee.name if t.employee else None,
        approved_by=t.approved_by,
        approver_name=t.approver.full_name if t.approver else None,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


@router.get("", response_model=TerminationListResponse)
def list_terminations(
    search: str = Query(None),
    employee_id: int = Query(None),
    status: str = Query(None),
    reason: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Termination)

    if search:
        pattern = f"%{search}%"
        query = query.join(Employee).filter(Employee.name.ilike(pattern))
    if employee_id:
        query = query.filter(Termination.employee_id == employee_id)
    if status:
        query = query.filter(Termination.status == status)
    if reason:
        query = query.filter(Termination.reason == reason)

    total = query.count()
    terminations = (
        query.order_by(Termination.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return TerminationListResponse(
        data=[_termination_to_response(t) for t in terminations],
        pagination=PaginationMeta(
            page=page, limit=limit, total=total,
            total_pages=math.ceil(total / limit) if total > 0 else 1,
        ),
    )


@router.get("/{termination_id}", response_model=TerminationResponse)
def get_termination(termination_id: int, db: Session = Depends(get_db)):
    t = db.query(Termination).filter(Termination.id == termination_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Termination not found")
    return _termination_to_response(t)


@router.post("", response_model=TerminationResponse, status_code=201)
def create_termination(data: TerminationCreate, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=400, detail="Employee not found")

    # Check for existing pending/approved termination
    existing = db.query(Termination).filter(
        Termination.employee_id == data.employee_id,
        Termination.status.in_(["pending", "approved"]),
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Nhan vien da co don nghi viec dang xu ly (#{existing.id})"
        )

    t = Termination(
        employee_id=data.employee_id,
        termination_date=data.termination_date,
        reason=data.reason,
        description=data.description,
        notice_date=data.notice_date,
        last_working_day=data.last_working_day,
        status="pending",  # Always start as pending
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _termination_to_response(t)


@router.put("/{termination_id}", response_model=TerminationResponse)
def update_termination(termination_id: int, data: TerminationUpdate, db: Session = Depends(get_db)):
    t = db.query(Termination).filter(Termination.id == termination_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Termination not found")

    if t.status == "completed":
        raise HTTPException(status_code=400, detail="Khong the sua don nghi viec da hoan tat")

    update_data = data.model_dump(exclude_unset=True)
    # Prevent direct status manipulation (use approve endpoint)
    if "status" in update_data and update_data["status"] in ("approved", "completed"):
        raise HTTPException(status_code=400, detail="Su dung endpoint /approve de phe duyet")

    for key, value in update_data.items():
        setattr(t, key, value)

    db.commit()
    db.refresh(t)
    return _termination_to_response(t)


# ── Termination Approval ─────────────────────────────────

@router.put("/{termination_id}/approve", response_model=TerminationResponse)
def approve_termination(
    termination_id: int,
    action: str = Query(..., pattern="^(approved|completed|cancelled)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Approve/complete/cancel a termination.
    - approved: HR approves the termination request
    - completed: Termination is finalized (side effects: employee terminated, contracts cancelled)
    - cancelled: Cancel the termination
    """
    t = db.query(Termination).filter(Termination.id == termination_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Termination not found")

    if action == "approved":
        if t.status != "pending":
            raise HTTPException(status_code=400, detail="Chi co the duyet don o trang thai 'pending'")
        t.status = "approved"
        t.approved_by = current_user.id

    elif action == "completed":
        if t.status not in ("approved",):
            raise HTTPException(status_code=400, detail="Chi co the hoan tat don da duoc duyet")
        t.status = "completed"
        # Side effects
        execute_termination_completion(db, t)

    elif action == "cancelled":
        if t.status == "completed":
            raise HTTPException(status_code=400, detail="Khong the huy don da hoan tat")
        t.status = "cancelled"

    db.commit()
    db.refresh(t)
    return _termination_to_response(t)


@router.delete("/{termination_id}")
def delete_termination(termination_id: int, db: Session = Depends(get_db)):
    t = db.query(Termination).filter(Termination.id == termination_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Termination not found")
    if t.status == "completed":
        raise HTTPException(status_code=400, detail="Khong the xoa don nghi viec da hoan tat")
    db.delete(t)
    db.commit()
    return {"message": "Termination record deleted successfully"}
