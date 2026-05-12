from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sqla_func, or_
from typing import Optional
import math

from database import get_db
from auth import get_current_user
from models import LeaveRequest, PublicHoliday, LeaveBalance, Employee, Department, User, Attendance, Contract
from schemas import (
    LeaveRequestCreate, LeaveRequestUpdate, LeaveRequestResponse, LeaveRequestListResponse,
    PublicHolidayCreate, PublicHolidayUpdate, PublicHolidayResponse, PublicHolidayListResponse,
    LeaveBalanceCreate, LeaveBalanceUpdate, LeaveBalanceResponse, LeaveBalanceListResponse,
    LeaveSummaryItem, LeaveSummaryResponse,
    AbsenteeismItem, AbsenteeismResponse,
    PaginationMeta,
)
from services.business_rules import (
    validate_leave_balance, validate_leave_no_overlap, restore_leave_balance,
)

router = APIRouter(prefix="/api/leaves", tags=["leaves"])


# ── Helpers ───────────────────────────────────────────────

def _leave_to_dict(lr, db):
    emp = db.query(Employee).filter(Employee.id == lr.employee_id).first()
    dept_name = None
    if emp and emp.department_id:
        dept = db.query(Department).filter(Department.id == emp.department_id).first()
        dept_name = dept.name if dept else None
    approver_name = None
    if lr.approved_by:
        approver = db.query(User).filter(User.id == lr.approved_by).first()
        approver_name = approver.full_name if approver else None
    return {
        "id": lr.id,
        "employee_id": lr.employee_id,
        "employee_name": emp.name if emp else None,
        "department_name": dept_name,
        "leave_type": lr.leave_type,
        "start_date": lr.start_date,
        "end_date": lr.end_date,
        "total_days": float(lr.total_days) if lr.total_days else 0,
        "reason": lr.reason,
        "status": lr.status,
        "approved_by": lr.approved_by,
        "approver_name": approver_name,
        "notes": lr.notes,
        "created_at": lr.created_at,
        "updated_at": lr.updated_at,
    }


def _balance_to_dict(b, db):
    emp = db.query(Employee).filter(Employee.id == b.employee_id).first()
    dept_name = None
    if emp and emp.department_id:
        dept = db.query(Department).filter(Department.id == emp.department_id).first()
        dept_name = dept.name if dept else None
    return {
        "id": b.id,
        "employee_id": b.employee_id,
        "employee_name": emp.name if emp else None,
        "department_name": dept_name,
        "year": b.year,
        "annual_total": float(b.annual_total or 0),
        "annual_used": float(b.annual_used or 0),
        "annual_remaining": float(b.annual_remaining or 0),
        "sick_total": float(b.sick_total or 0),
        "sick_used": float(b.sick_used or 0),
        "unpaid_used": float(b.unpaid_used or 0),
        "created_at": b.created_at,
        "updated_at": b.updated_at,
    }


# ══════════════════════════════════════════════════════════
#  LEAVE REQUESTS
# ══════════════════════════════════════════════════════════

@router.get("", response_model=LeaveRequestListResponse)
def list_leave_requests(
    search: Optional[str] = None,
    employee_id: Optional[int] = None,
    department_id: Optional[int] = None,
    leave_type: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    q = db.query(LeaveRequest)

    if employee_id:
        q = q.filter(LeaveRequest.employee_id == employee_id)
    if leave_type:
        q = q.filter(LeaveRequest.leave_type == leave_type)
    if status:
        q = q.filter(LeaveRequest.status == status)
    if date_from:
        q = q.filter(LeaveRequest.start_date >= date_from)
    if date_to:
        q = q.filter(LeaveRequest.end_date <= date_to)
    if department_id:
        emp_ids = [e.id for e in db.query(Employee.id).filter(Employee.department_id == department_id).all()]
        q = q.filter(LeaveRequest.employee_id.in_(emp_ids))
    if search:
        emp_ids = [e.id for e in db.query(Employee.id).filter(Employee.name.ilike(f"%{search}%")).all()]
        q = q.filter(LeaveRequest.employee_id.in_(emp_ids))

    total = q.count()
    total_pages = max(1, math.ceil(total / limit))
    items = q.order_by(LeaveRequest.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "data": [_leave_to_dict(item, db) for item in items],
        "pagination": {"page": page, "limit": limit, "total": total, "total_pages": total_pages},
    }


@router.post("", response_model=LeaveRequestResponse)
def create_leave_request(
    data: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Business rule: only active employees with running contract
    if emp.status not in ("active",):
        raise HTTPException(status_code=400, detail=f"Nhan vien '{emp.name}' khong o trang thai 'active'")

    has_contract = db.query(Contract).filter(
        Contract.employee_id == data.employee_id, Contract.status == "running"
    ).first()
    if not has_contract:
        raise HTTPException(status_code=400, detail="Nhan vien chua co hop dong hieu luc")

    # Validate balance
    year = int(data.start_date[:4])
    validate_leave_balance(db, data.employee_id, data.leave_type, float(data.total_days), year)

    # Validate no overlap
    validate_leave_no_overlap(db, data.employee_id, data.start_date, data.end_date)

    lr = LeaveRequest(**data.model_dump())
    db.add(lr)
    db.commit()
    db.refresh(lr)
    return _leave_to_dict(lr, db)


@router.put("/{leave_id}", response_model=LeaveRequestResponse)
def update_leave_request(
    leave_id: int,
    data: LeaveRequestUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    lr = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not lr:
        raise HTTPException(status_code=404, detail="Leave request not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lr, key, value)
    db.commit()
    db.refresh(lr)
    return _leave_to_dict(lr, db)


@router.delete("/{leave_id}")
def delete_leave_request(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    lr = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not lr:
        raise HTTPException(status_code=404, detail="Leave request not found")
    db.delete(lr)
    db.commit()
    return {"message": "Deleted successfully"}


@router.put("/{leave_id}/approve", response_model=LeaveRequestResponse)
def approve_leave_request(
    leave_id: int,
    action: str = Query(..., pattern="^(approved|rejected)$"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    lr = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not lr:
        raise HTTPException(status_code=404, detail="Leave request not found")
    lr.status = action
    lr.approved_by = current_user.id

    # Update leave balance when approved
    if action == "approved":
        # Validate balance before approving
        year = int(lr.start_date[:4])
        validate_leave_balance(db, lr.employee_id, lr.leave_type, float(lr.total_days), year)

        balance = db.query(LeaveBalance).filter(
            LeaveBalance.employee_id == lr.employee_id,
            LeaveBalance.year == year,
        ).first()
        if not balance:
            balance = LeaveBalance(employee_id=lr.employee_id, year=year)
            db.add(balance)
            db.flush()
        days = float(lr.total_days)
        if lr.leave_type == "annual":
            balance.annual_used = float(balance.annual_used or 0) + days
            balance.annual_remaining = float(balance.annual_total or 12) - float(balance.annual_used)
        elif lr.leave_type == "sick":
            balance.sick_used = float(balance.sick_used or 0) + days
        elif lr.leave_type == "unpaid":
            balance.unpaid_used = float(balance.unpaid_used or 0) + days

    db.commit()
    db.refresh(lr)
    return _leave_to_dict(lr, db)


@router.put("/{leave_id}/cancel", response_model=LeaveRequestResponse)
def cancel_leave_request(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Cancel a leave request. If it was approved, restore the balance."""
    lr = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not lr:
        raise HTTPException(status_code=404, detail="Leave request not found")
    if lr.status == "cancelled":
        raise HTTPException(status_code=400, detail="Don da bi huy")
    if lr.status == "rejected":
        raise HTTPException(status_code=400, detail="Don da bi tu choi, khong can huy")

    # Restore balance if was approved
    if lr.status == "approved":
        restore_leave_balance(db, lr)

    lr.status = "cancelled"
    db.commit()
    db.refresh(lr)
    return _leave_to_dict(lr, db)


# ══════════════════════════════════════════════════════════
#  ANNUAL LEAVE BALANCES
# ══════════════════════════════════════════════════════════

@router.get("/annual", response_model=LeaveBalanceListResponse)
def list_annual_balances(
    year: Optional[int] = None,
    employee_id: Optional[int] = None,
    department_id: Optional[int] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    q = db.query(LeaveBalance)
    if year:
        q = q.filter(LeaveBalance.year == year)
    if employee_id:
        q = q.filter(LeaveBalance.employee_id == employee_id)
    if department_id:
        emp_ids = [e.id for e in db.query(Employee.id).filter(Employee.department_id == department_id).all()]
        q = q.filter(LeaveBalance.employee_id.in_(emp_ids))
    if search:
        emp_ids = [e.id for e in db.query(Employee.id).filter(Employee.name.ilike(f"%{search}%")).all()]
        q = q.filter(LeaveBalance.employee_id.in_(emp_ids))

    total = q.count()
    total_pages = max(1, math.ceil(total / limit))
    items = q.order_by(LeaveBalance.year.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "data": [_balance_to_dict(b, db) for b in items],
        "pagination": {"page": page, "limit": limit, "total": total, "total_pages": total_pages},
    }


@router.post("/annual", response_model=LeaveBalanceResponse)
def create_or_update_balance(
    data: LeaveBalanceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    existing = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == data.employee_id,
        LeaveBalance.year == data.year,
    ).first()
    if existing:
        for key, value in data.model_dump().items():
            setattr(existing, key, value)
        db.commit()
        db.refresh(existing)
        return _balance_to_dict(existing, db)
    balance = LeaveBalance(**data.model_dump())
    db.add(balance)
    db.commit()
    db.refresh(balance)
    return _balance_to_dict(balance, db)


# ══════════════════════════════════════════════════════════
#  PUBLIC HOLIDAYS
# ══════════════════════════════════════════════════════════

@router.get("/public-holidays", response_model=PublicHolidayListResponse)
def list_public_holidays(
    year: Optional[int] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    q = db.query(PublicHoliday)
    if year:
        q = q.filter(or_(PublicHoliday.year == year, PublicHoliday.is_recurring == True))
    total = q.count()
    total_pages = max(1, math.ceil(total / limit))
    items = q.order_by(PublicHoliday.date.asc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "data": [
            {
                "id": h.id, "name": h.name, "date": h.date, "year": h.year,
                "is_recurring": h.is_recurring, "description": h.description,
                "created_at": h.created_at, "updated_at": h.updated_at,
            }
            for h in items
        ],
        "pagination": {"page": page, "limit": limit, "total": total, "total_pages": total_pages},
    }


@router.post("/public-holidays", response_model=PublicHolidayResponse)
def create_holiday(
    data: PublicHolidayCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    h = PublicHoliday(**data.model_dump())
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


@router.put("/public-holidays/{holiday_id}", response_model=PublicHolidayResponse)
def update_holiday(
    holiday_id: int,
    data: PublicHolidayUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    h = db.query(PublicHoliday).filter(PublicHoliday.id == holiday_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Holiday not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(h, key, value)
    db.commit()
    db.refresh(h)
    return h


@router.delete("/public-holidays/{holiday_id}")
def delete_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    h = db.query(PublicHoliday).filter(PublicHoliday.id == holiday_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Holiday not found")
    db.delete(h)
    db.commit()
    return {"message": "Deleted successfully"}


# ══════════════════════════════════════════════════════════
#  UNPAID LEAVE (filtered view)
# ══════════════════════════════════════════════════════════

@router.get("/unpaid", response_model=LeaveRequestListResponse)
def list_unpaid_leaves(
    search: Optional[str] = None,
    employee_id: Optional[int] = None,
    department_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    q = db.query(LeaveRequest).filter(LeaveRequest.leave_type == "unpaid")
    if employee_id:
        q = q.filter(LeaveRequest.employee_id == employee_id)
    if status:
        q = q.filter(LeaveRequest.status == status)
    if department_id:
        emp_ids = [e.id for e in db.query(Employee.id).filter(Employee.department_id == department_id).all()]
        q = q.filter(LeaveRequest.employee_id.in_(emp_ids))
    if search:
        emp_ids = [e.id for e in db.query(Employee.id).filter(Employee.name.ilike(f"%{search}%")).all()]
        q = q.filter(LeaveRequest.employee_id.in_(emp_ids))

    total = q.count()
    total_pages = max(1, math.ceil(total / limit))
    items = q.order_by(LeaveRequest.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "data": [_leave_to_dict(item, db) for item in items],
        "pagination": {"page": page, "limit": limit, "total": total, "total_pages": total_pages},
    }


# ══════════════════════════════════════════════════════════
#  LEAVE SUMMARY
# ══════════════════════════════════════════════════════════

@router.get("/summary", response_model=LeaveSummaryResponse)
def leave_summary(
    year: Optional[int] = None,
    department_id: Optional[int] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from datetime import datetime as dt
    if not year:
        year = dt.now().year

    emp_q = db.query(Employee).filter(Employee.status == "active")
    if department_id:
        emp_q = emp_q.filter(Employee.department_id == department_id)
    if search:
        emp_q = emp_q.filter(Employee.name.ilike(f"%{search}%"))

    total = emp_q.count()
    total_pages = max(1, math.ceil(total / limit))
    employees = emp_q.offset((page - 1) * limit).limit(limit).all()

    result = []
    for emp in employees:
        balance = db.query(LeaveBalance).filter(
            LeaveBalance.employee_id == emp.id,
            LeaveBalance.year == year,
        ).first()

        dept_name = None
        if emp.department_id:
            dept = db.query(Department).filter(Department.id == emp.department_id).first()
            dept_name = dept.name if dept else None

        annual_total = float(balance.annual_total) if balance else 12
        annual_used = float(balance.annual_used) if balance else 0
        annual_remaining = float(balance.annual_remaining) if balance else 12
        sick_used = float(balance.sick_used) if balance else 0
        unpaid_used = float(balance.unpaid_used) if balance else 0

        result.append({
            "employee_id": emp.id,
            "employee_name": emp.name,
            "department_name": dept_name,
            "annual_total": annual_total,
            "annual_used": annual_used,
            "annual_remaining": annual_remaining,
            "sick_used": sick_used,
            "unpaid_used": unpaid_used,
            "total_leave_days": annual_used + sick_used + unpaid_used,
        })

    return {
        "data": result,
        "pagination": {"page": page, "limit": limit, "total": total, "total_pages": total_pages},
    }


# ══════════════════════════════════════════════════════════
#  ABSENTEEISM
# ══════════════════════════════════════════════════════════

@router.get("/absenteeism", response_model=AbsenteeismResponse)
def absenteeism_report(
    year: Optional[int] = None,
    month: Optional[str] = None,
    department_id: Optional[int] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from datetime import datetime as dt
    if not year:
        year = dt.now().year

    emp_q = db.query(Employee).filter(Employee.status == "active")
    if department_id:
        emp_q = emp_q.filter(Employee.department_id == department_id)
    if search:
        emp_q = emp_q.filter(Employee.name.ilike(f"%{search}%"))

    total = emp_q.count()
    total_pages = max(1, math.ceil(total / limit))
    employees = emp_q.offset((page - 1) * limit).limit(limit).all()

    result = []
    for emp in employees:
        dept_name = None
        if emp.department_id:
            dept = db.query(Department).filter(Department.id == emp.department_id).first()
            dept_name = dept.name if dept else None

        # Count attendance records
        att_q = db.query(Attendance).filter(Attendance.employee_id == emp.id)
        if month:
            att_q = att_q.filter(Attendance.date.like(f"{month}%"))
        else:
            att_q = att_q.filter(Attendance.date.like(f"{year}%"))

        total_att = att_q.count()
        absent_count = att_q.filter(Attendance.status == "absent").count()

        # Count leave days
        leave_q = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == emp.id,
            LeaveRequest.status == "approved",
        )
        if month:
            leave_q = leave_q.filter(LeaveRequest.start_date.like(f"{month}%"))
        else:
            leave_q = leave_q.filter(LeaveRequest.start_date.like(f"{year}%"))

        leave_days = sum(float(lr.total_days) for lr in leave_q.all())

        working_days = total_att if total_att > 0 else 22 * 12  # fallback
        rate = ((absent_count + leave_days) / working_days * 100) if working_days > 0 else 0

        result.append({
            "employee_id": emp.id,
            "employee_name": emp.name,
            "department_name": dept_name,
            "total_working_days": float(working_days),
            "absent_days": float(absent_count),
            "leave_days": leave_days,
            "absenteeism_rate": round(rate, 1),
        })

    return {
        "data": result,
        "pagination": {"page": page, "limit": limit, "total": total, "total_pages": total_pages},
    }
