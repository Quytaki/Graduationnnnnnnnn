from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import math as pymath

from database import get_db
from auth import require_employee
from models import Employee, Department, JobPosition, Attendance, Overtime, LeaveRequest, LeaveBalance, PayrollSummary, Contract, CompanyLocation
from schemas import GPSCheckInRequest, GPSCheckOutRequest, AttendanceStatusResponse

router = APIRouter(prefix="/api/ess", tags=["Employee Self Service"])


# ── Helpers ───────────────────────────────────────────────

def _get_employee(db, user):
    emp = db.query(Employee).filter(Employee.id == user.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee profile not found")
    return emp


# ══════════════════════════════════════════════════════════
#  PROFILE
# ══════════════════════════════════════════════════════════

@router.get("/profile")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user=Depends(require_employee),
):
    emp = _get_employee(db, current_user)

    dept_name = None
    if emp.department_id:
        dept = db.query(Department).filter(Department.id == emp.department_id).first()
        dept_name = dept.name if dept else None

    position_name = None
    if emp.job_position_id:
        pos = db.query(JobPosition).filter(JobPosition.id == emp.job_position_id).first()
        position_name = pos.name if pos else None

    # Get active contract
    contract = db.query(Contract).filter(
        Contract.employee_id == emp.id,
        Contract.status == "active",
    ).first()

    # Get leave balance
    from datetime import datetime
    year = datetime.now().year
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == emp.id,
        LeaveBalance.year == year,
    ).first()

    return {
        "id": emp.id,
        "name": emp.name,
        "email": emp.email,
        "phone": emp.phone,
        "department_name": dept_name,
        "position_name": position_name,
        "company": emp.company,
        "work_address": emp.work_address,
        "work_email": emp.work_email,
        "work_phone": emp.work_phone,
        "hire_date": emp.hire_date,
        "status": emp.status,
        "avatar_color": emp.avatar_color,
        "contract": {
            "id": contract.id,
            "name": contract.name,
            "salary": float(contract.salary) if contract.salary else 0,
            "start_date": contract.start_date,
            "end_date": contract.end_date,
            "status": contract.status,
        } if contract else None,
        "leave_balance": {
            "annual_total": float(balance.annual_total) if balance else 12,
            "annual_used": float(balance.annual_used) if balance else 0,
            "annual_remaining": float(balance.annual_remaining) if balance else 12,
            "sick_total": float(balance.sick_total) if balance else 30,
            "sick_used": float(balance.sick_used) if balance else 0,
            "unpaid_used": float(balance.unpaid_used) if balance else 0,
        },
    }


@router.put("/profile")
def update_my_profile(
    data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_employee),
):
    emp = _get_employee(db, current_user)
    # Only allow updating certain fields
    allowed_fields = ["phone", "email", "work_phone", "work_email", "work_address"]
    for key, value in data.items():
        if key in allowed_fields:
            setattr(emp, key, value)
    db.commit()
    db.refresh(emp)
    return {"message": "Profile updated successfully"}


# ══════════════════════════════════════════════════════════
#  MY SALARY
# ══════════════════════════════════════════════════════════

@router.get("/salary")
def get_my_salary(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_employee),
):
    emp = _get_employee(db, current_user)

    q = db.query(PayrollSummary).filter(PayrollSummary.employee_id == emp.id)
    total = q.count()
    total_pages = max(1, pymath.ceil(total / limit))
    items = q.order_by(PayrollSummary.period.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "employee_name": emp.name,
        "data": [
            {
                "id": p.id,
                "month": p.period,
                "base_salary": float(p.base_salary) if p.base_salary else 0,
                "overtime_pay": float(p.overtime_pay) if p.overtime_pay else 0,
                "bonus": float(p.incentive_total) if p.incentive_total else 0,
                "deductions": float(p.deductions) if p.deductions else 0,
                "gross_salary": float(p.gross_salary) if p.gross_salary else 0,
                "net_salary": float(p.net_salary) if p.net_salary else 0,
                "status": p.status,
            }
            for p in items
        ],
        "pagination": {"page": page, "limit": limit, "total": total, "total_pages": total_pages},
    }


# ══════════════════════════════════════════════════════════
#  MY LEAVES
# ══════════════════════════════════════════════════════════

LEAVE_TYPES_MAP = {"annual": "Phép năm", "unpaid": "Không lương", "sick": "Ốm đau", "maternity": "Thai sản", "other": "Khác"}

@router.get("/leaves")
def get_my_leaves(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_employee),
):
    emp = _get_employee(db, current_user)

    q = db.query(LeaveRequest).filter(LeaveRequest.employee_id == emp.id)
    if status:
        q = q.filter(LeaveRequest.status == status)

    total = q.count()
    total_pages = max(1, pymath.ceil(total / limit))
    items = q.order_by(LeaveRequest.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "data": [
            {
                "id": lr.id,
                "leave_type": lr.leave_type,
                "leave_type_label": LEAVE_TYPES_MAP.get(lr.leave_type, lr.leave_type),
                "start_date": lr.start_date,
                "end_date": lr.end_date,
                "total_days": float(lr.total_days) if lr.total_days else 0,
                "reason": lr.reason,
                "status": lr.status,
                "notes": lr.notes,
                "created_at": lr.created_at,
            }
            for lr in items
        ],
        "pagination": {"page": page, "limit": limit, "total": total, "total_pages": total_pages},
    }


@router.post("/leaves")
def submit_leave_request(
    data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_employee),
):
    emp = _get_employee(db, current_user)

    lr = LeaveRequest(
        employee_id=emp.id,
        leave_type=data.get("leave_type", "annual"),
        start_date=data["start_date"],
        end_date=data["end_date"],
        total_days=data.get("total_days", 1),
        reason=data.get("reason", ""),
        status="pending",
    )
    db.add(lr)
    db.commit()
    db.refresh(lr)

    return {
        "message": "Leave request submitted",
        "id": lr.id,
        "status": lr.status,
    }


# ══════════════════════════════════════════════════════════
#  MY SCHEDULE / ATTENDANCE
# ══════════════════════════════════════════════════════════

@router.get("/schedule")
def get_my_schedule(
    month: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_employee),
):
    emp = _get_employee(db, current_user)

    q = db.query(Attendance).filter(Attendance.employee_id == emp.id)
    if month:
        q = q.filter(Attendance.date.like(f"{month}%"))

    total = q.count()
    total_pages = max(1, pymath.ceil(total / limit))
    items = q.order_by(Attendance.date.desc()).offset((page - 1) * limit).limit(limit).all()

    # Summary stats
    present = sum(1 for a in items if a.status == "present")
    absent = sum(1 for a in items if a.status == "absent")
    late = sum(1 for a in items if a.status == "late")

    return {
        "summary": {
            "total_records": total,
            "present": present,
            "absent": absent,
            "late": late,
        },
        "data": [
            {
                "id": a.id,
                "date": a.date,
                "check_in": a.check_in,
                "check_out": a.check_out,
                "worked_hours": float(a.worked_hours) if a.worked_hours else 0,
                "status": a.status,
                "overtime_hours": float(a.overtime_hours) if a.overtime_hours else 0,
            }
            for a in items
        ],
        "pagination": {"page": page, "limit": limit, "total": total, "total_pages": total_pages},
    }


# ══════════════════════════════════════════════════════════
#  GPS CHECK-IN / CHECK-OUT
# ══════════════════════════════════════════════════════════

def _haversine(lat1, lon1, lat2, lon2):
    """Return distance in meters between two GPS coordinates."""
    R = 6371000  # Earth radius in meters
    phi1 = pymath.radians(lat1)
    phi2 = pymath.radians(lat2)
    dphi = pymath.radians(lat2 - lat1)
    dlam = pymath.radians(lon2 - lon1)
    a = pymath.sin(dphi / 2) ** 2 + pymath.cos(phi1) * pymath.cos(phi2) * pymath.sin(dlam / 2) ** 2
    return R * 2 * pymath.atan2(pymath.sqrt(a), pymath.sqrt(1 - a))


def _find_nearest_location(db, lat, lng):
    """Find the nearest active company location within radius."""
    locations = db.query(CompanyLocation).filter(CompanyLocation.is_active == True).all()
    for loc in locations:
        distance = _haversine(lat, lng, loc.latitude, loc.longitude)
        if distance <= loc.radius_meters:
            return loc, distance
    return None, None


@router.get("/attendance/status")
def get_attendance_status(
    db: Session = Depends(get_db),
    current_user=Depends(require_employee),
):
    """Get today's attendance status for the current employee."""
    emp = _get_employee(db, current_user)
    today = datetime.now().strftime("%Y-%m-%d")

    att = db.query(Attendance).filter(
        Attendance.employee_id == emp.id,
        Attendance.date == today,
    ).first()

    if not att:
        return {
            "date": today,
            "checked_in": False,
            "checked_out": False,
            "check_in_time": None,
            "check_out_time": None,
            "check_in_status": None,
            "worked_hours": 0,
            "overtime_hours": 0,
            "status": None,
            "location_name": None,
        }

    # Calculate live worked hours if checked in but not out
    worked = float(att.worked_hours or 0)
    ot = float(att.overtime_hours or 0)
    if att.check_in and not att.check_out:
        diff = (datetime.now() - att.check_in).total_seconds() / 3600
        worked = round(max(0, diff), 2)
        ot = round(max(0, diff - 8), 2)

    loc_name = None
    if att.check_in_location_id:
        loc = db.query(CompanyLocation).filter(CompanyLocation.id == att.check_in_location_id).first()
        loc_name = loc.name if loc else None

    return {
        "date": today,
        "checked_in": att.check_in is not None,
        "checked_out": att.check_out is not None,
        "check_in_time": att.check_in,
        "check_out_time": att.check_out,
        "check_in_status": att.check_in_status,
        "worked_hours": worked,
        "overtime_hours": ot,
        "status": att.status,
        "location_name": loc_name,
    }


@router.post("/attendance/check-in")
def gps_check_in(
    data: GPSCheckInRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_employee),
):
    """Check-in with GPS verification against company locations."""
    emp = _get_employee(db, current_user)
    today = datetime.now().strftime("%Y-%m-%d")
    now = datetime.now()

    # Check if already checked in today
    existing = db.query(Attendance).filter(
        Attendance.employee_id == emp.id,
        Attendance.date == today,
    ).first()
    if existing and existing.check_in:
        raise HTTPException(status_code=400, detail="Bạn đã check-in hôm nay rồi")

    # Verify GPS against company locations
    loc, distance = _find_nearest_location(db, data.latitude, data.longitude)
    if not loc:
        # Get all locations and show distances for debugging
        all_locs = db.query(CompanyLocation).filter(CompanyLocation.is_active == True).all()
        if not all_locs:
            raise HTTPException(
                status_code=400,
                detail="Chưa có trụ sở nào được thiết lập. Liên hệ quản trị viên."
            )
        raise HTTPException(
            status_code=400,
            detail=f"Bạn không ở trong phạm vi trụ sở công ty. Vui lòng đến gần trụ sở để check-in."
        )

    # Determine on-time / late (late if after 8:15)
    cin_status = "late" if (now.hour > 8 or (now.hour == 8 and now.minute > 15)) else "ontime"

    if existing:
        # Update existing record
        existing.check_in = now
        existing.check_in_status = cin_status
        existing.check_in_lat = data.latitude
        existing.check_in_lng = data.longitude
        existing.check_in_location_id = loc.id
        existing.status = "present"
        db.commit()
        db.refresh(existing)
        att = existing
    else:
        att = Attendance(
            employee_id=emp.id,
            date=today,
            check_in=now,
            check_in_status=cin_status,
            check_in_lat=data.latitude,
            check_in_lng=data.longitude,
            check_in_location_id=loc.id,
            status="present",
        )
        db.add(att)
        db.commit()
        db.refresh(att)

    return {
        "message": f"Check-in thành công tại {loc.name}",
        "check_in_time": att.check_in,
        "check_in_status": cin_status,
        "location_name": loc.name,
        "distance_meters": round(distance, 1),
    }


@router.post("/attendance/check-out")
def gps_check_out(
    data: GPSCheckOutRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_employee),
):
    """Check-out — does NOT require GPS."""
    emp = _get_employee(db, current_user)
    today = datetime.now().strftime("%Y-%m-%d")
    now = datetime.now()

    att = db.query(Attendance).filter(
        Attendance.employee_id == emp.id,
        Attendance.date == today,
    ).first()

    if not att or not att.check_in:
        raise HTTPException(status_code=400, detail="Bạn chưa check-in hôm nay")
    if att.check_out:
        raise HTTPException(status_code=400, detail="Bạn đã check-out rồi")

    att.check_out = now
    if data.latitude:
        att.check_out_lat = data.latitude
    if data.longitude:
        att.check_out_lng = data.longitude

    # Calculate worked hours
    diff = (now - att.check_in).total_seconds() / 3600
    att.worked_hours = round(max(0, diff), 2)
    att.overtime_hours = round(max(0, diff - 8), 2)

    # Sync overtime record if OT > 0
    ot_hours = float(att.overtime_hours)
    if ot_hours > 0:
        existing_ot = db.query(Overtime).filter(
            Overtime.employee_id == emp.id,
            Overtime.date == today,
        ).first()
        ot_start = att.check_in + timedelta(hours=8)
        start_time = ot_start.strftime("%H:%M")
        end_time = now.strftime("%H:%M")
        if existing_ot:
            existing_ot.hours = ot_hours
            existing_ot.start_time = start_time
            existing_ot.end_time = end_time
            existing_ot.status = "approved"
            existing_ot.notes = "Tự động từ chấm công"
        else:
            new_ot = Overtime(
                employee_id=emp.id,
                date=today,
                start_time=start_time,
                end_time=end_time,
                hours=ot_hours,
                reason="Tăng ca (tự động từ chấm công)",
                status="approved",
                notes="Tự động từ chấm công",
            )
            db.add(new_ot)

    db.commit()
    db.refresh(att)

    return {
        "message": "Check-out thành công",
        "check_out_time": att.check_out,
        "worked_hours": float(att.worked_hours),
        "overtime_hours": float(att.overtime_hours),
    }


@router.get("/attendance/locations")
def get_company_locations_for_employee(
    db: Session = Depends(get_db),
    current_user=Depends(require_employee),
):
    """Get active company locations (for employee reference)."""
    locations = db.query(CompanyLocation).filter(CompanyLocation.is_active == True).all()
    return [
        {
            "id": loc.id,
            "name": loc.name,
            "address": loc.address,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "radius_meters": loc.radius_meters,
        }
        for loc in locations
    ]
