"""
Admin-only API endpoints for system administration.
Only users with role='admin' can access these endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime

from database import get_db
from auth import require_admin
from models import (
    User, Employee, Department, JobPosition, Contract, Termination,
    Attendance, Overtime, LeaveRequest, LeaveBalance, PublicHoliday,
    PayrollSummary, WorkingHour, IncentiveRate, CompanyLocation,
    Candidate, RecruitmentRequest, Application, Interview, Offer,
)

router = APIRouter(prefix="/api/admin", tags=["Administration"])


# ══════════════════════════════════════════════════════════
#  SYSTEM INFO / DATABASE OVERVIEW
# ══════════════════════════════════════════════════════════

@router.get("/system-info")
def get_system_info(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get database statistics and system overview."""
    stats = {
        "employees": {
            "total": db.query(func.count(Employee.id)).scalar(),
            "active": db.query(func.count(Employee.id)).filter(Employee.status == "active").scalar(),
            "archived": db.query(func.count(Employee.id)).filter(Employee.status == "archived").scalar(),
        },
        "departments": db.query(func.count(Department.id)).scalar(),
        "job_positions": db.query(func.count(JobPosition.id)).scalar(),
        "contracts": {
            "total": db.query(func.count(Contract.id)).scalar(),
            "draft": db.query(func.count(Contract.id)).filter(Contract.status == "draft").scalar(),
            "running": db.query(func.count(Contract.id)).filter(Contract.status == "running").scalar(),
            "expired": db.query(func.count(Contract.id)).filter(Contract.status == "expired").scalar(),
        },
        "terminations": {
            "total": db.query(func.count(Termination.id)).scalar(),
            "pending": db.query(func.count(Termination.id)).filter(Termination.status == "pending").scalar(),
            "completed": db.query(func.count(Termination.id)).filter(Termination.status == "completed").scalar(),
        },
        "attendance_records": db.query(func.count(Attendance.id)).scalar(),
        "overtime_records": db.query(func.count(Overtime.id)).scalar(),
        "leave_requests": {
            "total": db.query(func.count(LeaveRequest.id)).scalar(),
            "pending": db.query(func.count(LeaveRequest.id)).filter(LeaveRequest.status == "pending").scalar(),
            "approved": db.query(func.count(LeaveRequest.id)).filter(LeaveRequest.status == "approved").scalar(),
        },
        "payroll_records": db.query(func.count(PayrollSummary.id)).scalar(),
        "users": {
            "total": db.query(func.count(User.id)).scalar(),
            "admin": db.query(func.count(User.id)).filter(User.role == "admin").scalar(),
            "hr": db.query(func.count(User.id)).filter(User.role == "hr").scalar(),
            "employee": db.query(func.count(User.id)).filter(User.role == "employee").scalar(),
            "active": db.query(func.count(User.id)).filter(User.is_active == True).scalar(),
        },
        "company_locations": db.query(func.count(CompanyLocation.id)).scalar(),
        "recruitment": {
            "candidates": db.query(func.count(Candidate.id)).scalar(),
            "requests": db.query(func.count(RecruitmentRequest.id)).scalar(),
            "applications": db.query(func.count(Application.id)).scalar(),
            "interviews": db.query(func.count(Interview.id)).scalar(),
            "offers": db.query(func.count(Offer.id)).scalar(),
        },
        "incentive_rates": db.query(func.count(IncentiveRate.id)).scalar(),
        "working_hours": db.query(func.count(WorkingHour.id)).scalar(),
        "public_holidays": db.query(func.count(PublicHoliday.id)).scalar(),
        "leave_balances": db.query(func.count(LeaveBalance.id)).scalar(),
    }

    return {
        "stats": stats,
        "server_time": datetime.now().isoformat(),
    }


# ══════════════════════════════════════════════════════════
#  AUDIT LOG (activity tracking)
# ══════════════════════════════════════════════════════════

@router.get("/audit-log")
def get_audit_log(
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get recent system activity.
    Builds a virtual audit log from created_at/updated_at timestamps across models.
    """
    activities = []

    # Recent employees
    recent_employees = db.query(Employee).order_by(Employee.created_at.desc()).limit(20).all()
    for emp in recent_employees:
        activities.append({
            "type": "employee",
            "action": "created",
            "description": f"Nhân viên \"{emp.name}\" được tạo",
            "target_name": emp.name,
            "target_id": emp.id,
            "timestamp": emp.created_at.isoformat() if emp.created_at else None,
        })

    # Recent contracts
    recent_contracts = db.query(Contract).order_by(Contract.created_at.desc()).limit(20).all()
    for c in recent_contracts:
        emp = db.query(Employee).filter(Employee.id == c.employee_id).first()
        emp_name = emp.name if emp else f"ID#{c.employee_id}"
        activities.append({
            "type": "contract",
            "action": "created",
            "description": f"Hợp đồng {c.reference or ''} cho \"{emp_name}\" - {c.status}",
            "target_name": c.reference or f"Contract #{c.id}",
            "target_id": c.id,
            "timestamp": c.created_at.isoformat() if c.created_at else None,
        })

    # Recent leave requests
    recent_leaves = db.query(LeaveRequest).order_by(LeaveRequest.created_at.desc()).limit(20).all()
    for lr in recent_leaves:
        emp = db.query(Employee).filter(Employee.id == lr.employee_id).first()
        emp_name = emp.name if emp else f"ID#{lr.employee_id}"
        activities.append({
            "type": "leave",
            "action": lr.status,
            "description": f"Đơn nghỉ phép của \"{emp_name}\" ({lr.leave_type}) - {lr.status}",
            "target_name": emp_name,
            "target_id": lr.id,
            "timestamp": lr.created_at.isoformat() if lr.created_at else None,
        })

    # Recent terminations
    recent_terms = db.query(Termination).order_by(Termination.created_at.desc()).limit(20).all()
    for t in recent_terms:
        emp = db.query(Employee).filter(Employee.id == t.employee_id).first()
        emp_name = emp.name if emp else f"ID#{t.employee_id}"
        activities.append({
            "type": "termination",
            "action": t.status,
            "description": f"Nghỉ việc: \"{emp_name}\" - {t.reason} ({t.status})",
            "target_name": emp_name,
            "target_id": t.id,
            "timestamp": t.created_at.isoformat() if t.created_at else None,
        })

    # Recent users
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(10).all()
    for u in recent_users:
        activities.append({
            "type": "user",
            "action": "created",
            "description": f"Tài khoản \"{u.username}\" ({u.role}) được tạo",
            "target_name": u.username,
            "target_id": u.id,
            "timestamp": u.created_at.isoformat() if u.created_at else None,
        })

    # Sort by timestamp desc
    activities.sort(key=lambda x: x["timestamp"] or "", reverse=True)

    # Paginate
    total = len(activities)
    start = (page - 1) * limit
    end = start + limit
    page_data = activities[start:end]

    return {
        "data": page_data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": max(1, -(-total // limit)),
        },
    }


# ══════════════════════════════════════════════════════════
#  SYSTEM SETTINGS
# ══════════════════════════════════════════════════════════

# In-memory settings store (in production, use DB table)
_system_settings = {
    "company_name": "TechCorp",
    "timezone": "Asia/Ho_Chi_Minh",
    "work_start_time": "08:00",
    "work_end_time": "17:00",
    "late_threshold_minutes": 15,
    "standard_work_hours": 8,
    "standard_work_days": 22,
    "gps_radius_default": 200,
    "currency": "VND",
    "date_format": "DD/MM/YYYY",
    "allow_employee_profile_edit": True,
    "auto_checkout_enabled": False,
    "auto_checkout_time": "23:59",
}


@router.get("/settings")
def get_settings(
    current_user: User = Depends(require_admin),
):
    """Get system settings."""
    return {"settings": _system_settings}


@router.put("/settings")
def update_settings(
    data: dict,
    current_user: User = Depends(require_admin),
):
    """Update system settings."""
    allowed_keys = set(_system_settings.keys())
    updated = []
    for key, value in data.items():
        if key in allowed_keys:
            _system_settings[key] = value
            updated.append(key)

    if not updated:
        raise HTTPException(status_code=400, detail="No valid settings provided")

    return {
        "message": f"Updated {len(updated)} setting(s)",
        "updated_keys": updated,
        "settings": _system_settings,
    }


# ══════════════════════════════════════════════════════════
#  CONFIG STATUS (AI + Email)
# ══════════════════════════════════════════════════════════

@router.get("/config-status")
def get_config_status(current_user: User = Depends(require_admin)):
    """Check AI and Email configuration status."""
    import os

    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_pass = os.environ.get("SMTP_PASS", "")

    ai_configured = bool(gemini_key and gemini_key != "your-gemini-api-key-here")
    email_configured = bool(smtp_user and smtp_pass)

    return {
        "ai": {
            "configured": ai_configured,
            "provider": "Google Gemini",
            "model": os.environ.get("GEMINI_MODEL", "gemini-2.5-pro"),
            "key_preview": f"{gemini_key[:8]}...{gemini_key[-4:]}" if ai_configured else None,
        },
        "email": {
            "configured": email_configured,
            "host": os.environ.get("SMTP_HOST", "smtp.gmail.com"),
            "user": smtp_user if email_configured else None,
        },
    }
