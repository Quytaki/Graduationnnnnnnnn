from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func as sa_func, case
from datetime import datetime, timedelta
from typing import Optional
import math

from database import get_db
from models import Attendance, Overtime, Employee, Department, User, Contract
from schemas import (
    AttendanceCreate, AttendanceUpdate, AttendanceResponse, AttendanceListResponse,
    AttendanceImportRow, AttendanceGenerateRequest,
    OvertimeCreate, OvertimeUpdate, OvertimeResponse, OvertimeListResponse,
    OvertimeSummaryItem, OvertimeSummaryResponse,
    PaginationMeta,
)
from auth import get_current_user

router = APIRouter(prefix="/api/attendances", tags=["Attendances"])


# ── helpers ───────────────────────────────────────────────

def _sync_overtime_from_attendance(db: Session, att: Attendance, approver_id: int = None):
    """Sync overtime record when attendance has OT hours.
    - If OT > 0: create or update a matching Overtime record (auto-approved).
    - If OT == 0: delete any matching Overtime record that was auto-created.
    """
    ot_hours = float(att.overtime_hours or 0)
    existing_ot = db.query(Overtime).filter(
        Overtime.employee_id == att.employee_id,
        Overtime.date == att.date,
    ).first()

    if ot_hours > 0:
        # Derive start/end from check_in/check_out
        start_time = None
        end_time = None
        if att.check_out:
            # OT starts after 8h of work
            end_time = att.check_out.strftime("%H:%M") if hasattr(att.check_out, 'strftime') else None
            if att.check_in and hasattr(att.check_in, 'strftime'):
                ot_start = att.check_in + timedelta(hours=8)
                start_time = ot_start.strftime("%H:%M")

        if existing_ot:
            existing_ot.hours = ot_hours
            existing_ot.start_time = start_time
            existing_ot.end_time = end_time
            existing_ot.status = "approved"
            if approver_id:
                existing_ot.approved_by = approver_id
            existing_ot.notes = "Tự động từ chấm công"
        else:
            new_ot = Overtime(
                employee_id=att.employee_id,
                date=att.date,
                start_time=start_time,
                end_time=end_time,
                hours=ot_hours,
                reason="Tăng ca (tự động từ chấm công)",
                status="approved",
                approved_by=approver_id,
                notes="Tự động từ chấm công",
            )
            db.add(new_ot)
    else:
        # Remove auto-created OT record if hours went to 0
        if existing_ot and existing_ot.notes == "Tự động từ chấm công":
            db.delete(existing_ot)


def _att_to_resp(att: Attendance) -> dict:
    emp = att.employee
    return {
        "id": att.id,
        "employee_id": att.employee_id,
        "date": att.date,
        "check_in": att.check_in,
        "check_out": att.check_out,
        "check_in_status": att.check_in_status,
        "worked_hours": float(att.worked_hours or 0),
        "overtime_hours": float(att.overtime_hours or 0),
        "status": att.status,
        "notes": att.notes,
        "employee_name": emp.name if emp else None,
        "department_name": emp.department.name if emp and emp.department else None,
        "created_at": att.created_at,
        "updated_at": att.updated_at,
    }


def _ot_to_resp(ot: Overtime) -> dict:
    emp = ot.employee
    return {
        "id": ot.id,
        "employee_id": ot.employee_id,
        "date": ot.date,
        "start_time": ot.start_time,
        "end_time": ot.end_time,
        "hours": float(ot.hours or 0),
        "reason": ot.reason,
        "status": ot.status,
        "notes": ot.notes,
        "employee_name": emp.name if emp else None,
        "department_name": emp.department.name if emp and emp.department else None,
        "approver_name": ot.approver.full_name if ot.approver else None,
        "created_at": ot.created_at,
        "updated_at": ot.updated_at,
    }


# ══════════════════════════════════════════════════════════
#  ATTENDANCE CRUD
# ══════════════════════════════════════════════════════════

@router.get("", response_model=AttendanceListResponse)
def list_attendances(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    employee_id: Optional[int] = None,
    department_id: Optional[int] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Attendance).options(
        joinedload(Attendance.employee).joinedload(Employee.department)
    )

    if search:
        q = q.join(Employee).filter(Employee.name.ilike(f"%{search}%"))
    if employee_id:
        q = q.filter(Attendance.employee_id == employee_id)
    if department_id:
        q = q.join(Employee, Attendance.employee_id == Employee.id).filter(Employee.department_id == department_id)
    if status:
        q = q.filter(Attendance.status == status)
    if date_from:
        q = q.filter(Attendance.date >= date_from)
    if date_to:
        q = q.filter(Attendance.date <= date_to)

    total = q.count()
    records = q.order_by(Attendance.date.desc(), Attendance.id.desc()) \
               .offset((page - 1) * limit).limit(limit).all()

    return {
        "data": [_att_to_resp(r) for r in records],
        "pagination": {
            "page": page, "limit": limit, "total": total,
            "total_pages": max(1, math.ceil(total / limit)),
        },
    }


@router.post("", response_model=AttendanceResponse, status_code=201)
def create_attendance(
    data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    att = Attendance(**data.model_dump())
    db.add(att)
    db.flush()
    _sync_overtime_from_attendance(db, att, current_user.id)
    db.commit()
    db.refresh(att)
    db.refresh(att, ["employee"])
    return _att_to_resp(att)


@router.put("/{att_id}", response_model=AttendanceResponse)
def update_attendance(
    att_id: int,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    att = db.query(Attendance).filter(Attendance.id == att_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(att, k, v)
    _sync_overtime_from_attendance(db, att, current_user.id)
    db.commit()
    db.refresh(att, ["employee"])
    return _att_to_resp(att)


@router.delete("/{att_id}")
def delete_attendance(
    att_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    att = db.query(Attendance).filter(Attendance.id == att_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    db.delete(att)
    db.commit()
    return {"message": "Attendance record deleted"}


# ══════════════════════════════════════════════════════════
#  IMPORT & GENERATE
# ══════════════════════════════════════════════════════════

@router.post("/import")
def import_attendances(
    rows: list[AttendanceImportRow],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    created = 0
    skipped = 0
    errors = []

    for i, row in enumerate(rows):
        emp = db.query(Employee).filter(Employee.id == row.employee_id).first()
        if not emp:
            errors.append(f"Row {i+1}: Employee ID {row.employee_id} not found")
            skipped += 1
            continue

        # Business rule: skip non-active employees
        if emp.status != "active":
            errors.append(f"Row {i+1}: {emp.name} khong o trang thai 'active'")
            skipped += 1
            continue

        # Business rule: skip employees without running contract
        has_contract = db.query(Contract).filter(
            Contract.employee_id == emp.id, Contract.status == "running"
        ).first()
        if not has_contract:
            errors.append(f"Row {i+1}: {emp.name} khong co hop dong hieu luc")
            skipped += 1
            continue

        existing = db.query(Attendance).filter(
            Attendance.employee_id == row.employee_id,
            Attendance.date == row.date,
        ).first()
        if existing:
            skipped += 1
            continue

        check_in_dt = None
        check_out_dt = None
        if row.check_in:
            try:
                check_in_dt = datetime.fromisoformat(f"{row.date}T{row.check_in}:00")
            except ValueError:
                pass
        if row.check_out:
            try:
                check_out_dt = datetime.fromisoformat(f"{row.date}T{row.check_out}:00")
            except ValueError:
                pass

        worked = 0
        ot = 0
        if check_in_dt and check_out_dt:
            diff = (check_out_dt - check_in_dt).total_seconds() / 3600
            worked = round(max(0, diff), 2)
            ot = round(max(0, diff - 8), 2)

        cin_status = None
        if check_in_dt:
            cin_status = "late" if check_in_dt.hour >= 9 or (check_in_dt.hour == 8 and check_in_dt.minute > 15) else "ontime"

        att = Attendance(
            employee_id=row.employee_id, date=row.date,
            check_in=check_in_dt, check_out=check_out_dt,
            check_in_status=cin_status, worked_hours=worked,
            overtime_hours=ot, status=row.status, notes=row.notes,
        )
        db.add(att)
        db.flush()
        _sync_overtime_from_attendance(db, att, current_user.id)
        created += 1

    db.commit()
    return {"created": created, "skipped": skipped, "errors": errors}


@router.post("/generate")
def generate_attendances(
    req: AttendanceGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employees = db.query(Employee).filter(Employee.status == "active").all()
    if not employees:
        raise HTTPException(status_code=400, detail="No active employees found")

    start = datetime.strptime(req.start_date, "%Y-%m-%d").date()
    end = datetime.strptime(req.end_date, "%Y-%m-%d").date()
    if end < start:
        raise HTTPException(status_code=400, detail="end_date must be >= start_date")

    created = 0
    skipped = 0
    current = start
    while current <= end:
        if current.weekday() >= 5:  # skip weekends
            current += timedelta(days=1)
            continue

        date_str = current.strftime("%Y-%m-%d")
        for emp in employees:
            # Business rule: skip employees without running contract
            has_contract = db.query(Contract).filter(
                Contract.employee_id == emp.id,
                Contract.status == "running",
                Contract.start_date <= date_str,
            ).first()
            if not has_contract:
                skipped += 1
                continue

            existing = db.query(Attendance).filter(
                Attendance.employee_id == emp.id,
                Attendance.date == date_str,
            ).first()
            if existing:
                skipped += 1
                continue

            check_in_dt = None
            check_out_dt = None
            worked = 0
            if req.default_status == "present" and req.default_check_in and req.default_check_out:
                try:
                    check_in_dt = datetime.fromisoformat(f"{date_str}T{req.default_check_in}:00")
                    check_out_dt = datetime.fromisoformat(f"{date_str}T{req.default_check_out}:00")
                    worked = round((check_out_dt - check_in_dt).total_seconds() / 3600, 2)
                except ValueError:
                    pass

            ot_val = max(0, worked - 8) if worked > 8 else 0
            att = Attendance(
                employee_id=emp.id, date=date_str,
                check_in=check_in_dt, check_out=check_out_dt,
                check_in_status="ontime" if check_in_dt else None,
                worked_hours=max(0, worked), overtime_hours=ot_val,
                status=req.default_status,
            )
            db.add(att)
            db.flush()
            if ot_val > 0:
                _sync_overtime_from_attendance(db, att, current_user.id)
            created += 1

        current += timedelta(days=1)

    db.commit()
    return {"created": created, "skipped": skipped, "employees": len(employees)}


# ══════════════════════════════════════════════════════════
#  ATTENDANCE REPORT
# ══════════════════════════════════════════════════════════

@router.get("/report")
def attendance_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    employee_id: Optional[int] = None,
    department_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Attendance).options(
        joinedload(Attendance.employee).joinedload(Employee.department)
    )
    if employee_id:
        q = q.filter(Attendance.employee_id == employee_id)
    if department_id:
        q = q.join(Employee, Attendance.employee_id == Employee.id).filter(Employee.department_id == department_id)
    if date_from:
        q = q.filter(Attendance.date >= date_from)
    if date_to:
        q = q.filter(Attendance.date <= date_to)

    total = q.count()
    records = q.order_by(Attendance.date.desc(), Attendance.employee_id).offset((page - 1) * limit).limit(limit).all()

    # Summary stats
    all_q = db.query(Attendance)
    if employee_id:
        all_q = all_q.filter(Attendance.employee_id == employee_id)
    if department_id:
        all_q = all_q.join(Employee, Attendance.employee_id == Employee.id).filter(Employee.department_id == department_id)
    if date_from:
        all_q = all_q.filter(Attendance.date >= date_from)
    if date_to:
        all_q = all_q.filter(Attendance.date <= date_to)

    stats = all_q.with_entities(
        sa_func.count().label("total_records"),
        sa_func.count(case((Attendance.status == "present", 1))).label("present_count"),
        sa_func.count(case((Attendance.status == "absent", 1))).label("absent_count"),
        sa_func.count(case((Attendance.status == "on_leave", 1))).label("on_leave_count"),
        sa_func.count(case((Attendance.check_in_status == "late", 1))).label("late_count"),
        sa_func.coalesce(sa_func.sum(Attendance.worked_hours), 0).label("total_worked"),
        sa_func.coalesce(sa_func.sum(Attendance.overtime_hours), 0).label("total_overtime"),
    ).first()

    return {
        "data": [_att_to_resp(r) for r in records],
        "pagination": {
            "page": page, "limit": limit, "total": total,
            "total_pages": max(1, math.ceil(total / limit)),
        },
        "summary": {
            "total_records": stats.total_records,
            "present_count": stats.present_count,
            "absent_count": stats.absent_count,
            "on_leave_count": stats.on_leave_count,
            "late_count": stats.late_count,
            "total_worked_hours": round(float(stats.total_worked), 1),
            "total_overtime_hours": round(float(stats.total_overtime), 1),
        },
    }


# ══════════════════════════════════════════════════════════
#  OVERTIME CRUD
# ══════════════════════════════════════════════════════════

@router.get("/overtime", response_model=OvertimeListResponse)
def list_overtime(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    employee_id: Optional[int] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Overtime).options(
        joinedload(Overtime.employee).joinedload(Employee.department),
        joinedload(Overtime.approver),
    )

    if search:
        q = q.join(Employee).filter(Employee.name.ilike(f"%{search}%"))
    if employee_id:
        q = q.filter(Overtime.employee_id == employee_id)
    if status:
        q = q.filter(Overtime.status == status)
    if date_from:
        q = q.filter(Overtime.date >= date_from)
    if date_to:
        q = q.filter(Overtime.date <= date_to)

    total = q.count()
    records = q.order_by(Overtime.date.desc(), Overtime.id.desc()) \
               .offset((page - 1) * limit).limit(limit).all()

    return {
        "data": [_ot_to_resp(r) for r in records],
        "pagination": {
            "page": page, "limit": limit, "total": total,
            "total_pages": max(1, math.ceil(total / limit)),
        },
    }


@router.post("/overtime", response_model=OvertimeResponse, status_code=201)
def create_overtime(
    data: OvertimeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ot = Overtime(**data.model_dump())
    db.add(ot)
    db.commit()
    db.refresh(ot)
    db.refresh(ot, ["employee", "approver"])
    return _ot_to_resp(ot)


@router.put("/overtime/{ot_id}", response_model=OvertimeResponse)
def update_overtime(
    ot_id: int,
    data: OvertimeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ot = db.query(Overtime).filter(Overtime.id == ot_id).first()
    if not ot:
        raise HTTPException(status_code=404, detail="Overtime record not found")
    updates = data.model_dump(exclude_unset=True)
    # If approving/rejecting, record approver
    if "status" in updates and updates["status"] in ("approved", "rejected"):
        ot.approved_by = current_user.id
    for k, v in updates.items():
        setattr(ot, k, v)

    # Sync approved OT hours back to attendance record
    if ot.status == "approved":
        att = db.query(Attendance).filter(
            Attendance.employee_id == ot.employee_id,
            Attendance.date == ot.date,
        ).first()
        if att:
            # Sum all approved OT for this employee on this date
            total_approved_ot = db.query(sa_func.coalesce(sa_func.sum(Overtime.hours), 0)).filter(
                Overtime.employee_id == ot.employee_id,
                Overtime.date == ot.date,
                Overtime.status == "approved",
            ).scalar()
            att.overtime_hours = float(total_approved_ot)
    elif ot.status == "rejected":
        att = db.query(Attendance).filter(
            Attendance.employee_id == ot.employee_id,
            Attendance.date == ot.date,
        ).first()
        if att:
            total_approved_ot = db.query(sa_func.coalesce(sa_func.sum(Overtime.hours), 0)).filter(
                Overtime.employee_id == ot.employee_id,
                Overtime.date == ot.date,
                Overtime.status == "approved",
                Overtime.id != ot.id,
            ).scalar()
            att.overtime_hours = float(total_approved_ot)

    db.commit()
    db.refresh(ot, ["employee", "approver"])
    return _ot_to_resp(ot)


@router.delete("/overtime/{ot_id}")
def delete_overtime(
    ot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ot = db.query(Overtime).filter(Overtime.id == ot_id).first()
    if not ot:
        raise HTTPException(status_code=404, detail="Overtime record not found")
    db.delete(ot)
    db.commit()
    return {"message": "Overtime record deleted"}


# ══════════════════════════════════════════════════════════
#  OVERTIME SUMMARY
# ══════════════════════════════════════════════════════════

@router.get("/overtime/summary", response_model=OvertimeSummaryResponse)
def overtime_summary(
    period: Optional[str] = None,          # "2026-03"
    employee_id: Optional[int] = None,
    department_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Build a raw aggregation
    q = db.query(
        Overtime.employee_id,
        Employee.name.label("employee_name"),
        Department.name.label("department_name"),
        sa_func.substr(Overtime.date, 1, 7).label("period"),
        sa_func.sum(Overtime.hours).label("total_hours"),
        sa_func.sum(case((Overtime.status == "approved", Overtime.hours), else_=0)).label("approved_hours"),
        sa_func.sum(case((Overtime.status == "pending", Overtime.hours), else_=0)).label("pending_hours"),
        sa_func.sum(case((Overtime.status == "rejected", Overtime.hours), else_=0)).label("rejected_hours"),
        sa_func.count(Overtime.id).label("entry_count"),
    ).join(Employee, Overtime.employee_id == Employee.id) \
     .outerjoin(Department, Employee.department_id == Department.id)

    if period:
        q = q.filter(sa_func.substr(Overtime.date, 1, 7) == period)
    if employee_id:
        q = q.filter(Overtime.employee_id == employee_id)
    if department_id:
        q = q.filter(Employee.department_id == department_id)

    q = q.group_by(Overtime.employee_id, Employee.name, Department.name, sa_func.substr(Overtime.date, 1, 7))

    total = q.count()
    rows = q.order_by(sa_func.substr(Overtime.date, 1, 7).desc(), Employee.name) \
            .offset((page - 1) * limit).limit(limit).all()

    data = [
        {
            "employee_id": r.employee_id,
            "employee_name": r.employee_name,
            "department_name": r.department_name,
            "period": r.period,
            "total_hours": round(float(r.total_hours or 0), 1),
            "approved_hours": round(float(r.approved_hours or 0), 1),
            "pending_hours": round(float(r.pending_hours or 0), 1),
            "rejected_hours": round(float(r.rejected_hours or 0), 1),
            "entry_count": r.entry_count,
        }
        for r in rows
    ]

    return {
        "data": data,
        "pagination": {
            "page": page, "limit": limit, "total": total,
            "total_pages": max(1, math.ceil(total / limit)),
        },
    }
