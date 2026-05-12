from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from typing import Optional
from datetime import datetime

from database import get_db
from auth import get_current_user
from models import (
    Employee, Department, Termination, PayrollSummary,
    Attendance, LeaveRequest, LeaveBalance, Contract
)

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


@router.get("/dashboard")
def hr_dashboard(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not year:
        year = datetime.now().year

    # ══════════════════════════════════════════════════════
    #  1. EMPLOYEE OVERVIEW
    # ══════════════════════════════════════════════════════
    total_employees = db.query(Employee).count()
    active_employees = db.query(Employee).filter(Employee.status == "active").count()
    archived_employees = db.query(Employee).filter(Employee.status == "archived").count()

    # By department
    dept_breakdown = (
        db.query(Department.name, sql_func.count(Employee.id))
        .outerjoin(Employee, Employee.department_id == Department.id)
        .group_by(Department.name)
        .all()
    )
    departments_data = [{"name": name, "count": count} for name, count in dept_breakdown]

    # New hires this year
    year_prefix = str(year)
    new_hires = db.query(Employee).filter(
        Employee.hire_date.like(f"{year_prefix}%")
    ).count()

    # ══════════════════════════════════════════════════════
    #  2. TURNOVER RATE
    # ══════════════════════════════════════════════════════
    terminations_total = db.query(Termination).filter(
        Termination.termination_date.like(f"{year_prefix}%")
    ).count()

    turnover_rate = round((terminations_total / max(total_employees, 1)) * 100, 1)

    # By reason
    reason_breakdown = (
        db.query(Termination.reason, sql_func.count(Termination.id))
        .filter(Termination.termination_date.like(f"{year_prefix}%"))
        .group_by(Termination.reason)
        .all()
    )
    reason_labels = {
        "resignation": "Tự nghỉ",
        "dismissal": "Sa thải",
        "layoff": "Cắt giảm",
        "end_of_contract": "Hết hợp đồng",
        "retirement": "Nghỉ hưu",
        "mutual_agreement": "Thoả thuận",
    }
    reasons_data = [
        {"reason": reason_labels.get(r, r), "count": c}
        for r, c in reason_breakdown
    ]

    # By month
    turnover_by_month = []
    for m in range(1, 13):
        month_prefix = f"{year_prefix}-{m:02d}"
        count = db.query(Termination).filter(
            Termination.termination_date.like(f"{month_prefix}%")
        ).count()
        turnover_by_month.append({"month": f"T{m}", "count": count})

    # ══════════════════════════════════════════════════════
    #  3. PAYROLL COST
    # ══════════════════════════════════════════════════════
    payroll_items = db.query(PayrollSummary).filter(
        PayrollSummary.period.like(f"{year_prefix}%")
    ).all()

    total_gross = sum(float(p.gross_salary or 0) for p in payroll_items)
    total_net = sum(float(p.net_salary or 0) for p in payroll_items)
    total_deductions = sum(float(p.deductions or 0) for p in payroll_items)
    total_overtime = sum(float(p.overtime_pay or 0) for p in payroll_items)
    avg_salary = round(total_net / max(len(payroll_items), 1), 0)

    # Monthly payroll
    payroll_by_month = []
    for m in range(1, 13):
        month_key = f"{year_prefix}-{m:02d}"
        month_items = [p for p in payroll_items if p.period == month_key]
        month_net = sum(float(p.net_salary or 0) for p in month_items)
        month_emp = len(month_items)
        payroll_by_month.append({"month": f"T{m}", "net_salary": month_net, "employees": month_emp})

    # Average salary by department
    dept_salary = (
        db.query(
            Department.name,
            sql_func.avg(Contract.salary),
            sql_func.count(Contract.id),
        )
        .join(Contract, Contract.department_id == Department.id)
        .filter(Contract.status == "running")
        .group_by(Department.name)
        .all()
    )
    dept_salary_data = [
        {"name": name, "avg_salary": round(float(avg or 0), 0), "contracts": count}
        for name, avg, count in dept_salary
    ]

    # ══════════════════════════════════════════════════════
    #  4. ATTENDANCE STATS
    # ══════════════════════════════════════════════════════
    att_all = db.query(Attendance).filter(
        Attendance.date.like(f"{year_prefix}%")
    )
    att_total = att_all.count()
    att_present = att_all.filter(Attendance.status == "present").count()
    att_absent = att_all.filter(Attendance.status == "absent").count()
    att_late = att_all.filter(Attendance.status == "late").count()

    att_rate = round((att_present / max(att_total, 1)) * 100, 1)
    absent_rate = round((att_absent / max(att_total, 1)) * 100, 1)
    late_rate = round((att_late / max(att_total, 1)) * 100, 1)

    # Attendance by month
    att_by_month = []
    for m in range(1, 13):
        month_prefix = f"{year_prefix}-{m:02d}"
        m_total = db.query(Attendance).filter(Attendance.date.like(f"{month_prefix}%")).count()
        m_present = db.query(Attendance).filter(Attendance.date.like(f"{month_prefix}%"), Attendance.status == "present").count()
        m_absent = db.query(Attendance).filter(Attendance.date.like(f"{month_prefix}%"), Attendance.status == "absent").count()
        m_late = db.query(Attendance).filter(Attendance.date.like(f"{month_prefix}%"), Attendance.status == "late").count()
        att_by_month.append({
            "month": f"T{m}",
            "total": m_total,
            "present": m_present,
            "absent": m_absent,
            "late": m_late,
            "rate": round((m_present / max(m_total, 1)) * 100, 1),
        })

    # Leave summary
    leave_total = db.query(LeaveRequest).filter(
        LeaveRequest.start_date.like(f"{year_prefix}%"),
        LeaveRequest.status == "approved",
    ).count()

    return {
        "year": year,
        "employees": {
            "total": total_employees,
            "active": active_employees,
            "archived": archived_employees,
            "new_hires": new_hires,
            "by_department": departments_data,
        },
        "turnover": {
            "total": terminations_total,
            "rate": turnover_rate,
            "by_reason": reasons_data,
            "by_month": turnover_by_month,
        },
        "payroll": {
            "total_gross": total_gross,
            "total_net": total_net,
            "total_deductions": total_deductions,
            "total_overtime": total_overtime,
            "avg_salary": avg_salary,
            "by_month": payroll_by_month,
            "by_department": dept_salary_data,
        },
        "attendance": {
            "total": att_total,
            "present": att_present,
            "absent": att_absent,
            "late": att_late,
            "attendance_rate": att_rate,
            "absent_rate": absent_rate,
            "late_rate": late_rate,
            "approved_leaves": leave_total,
            "by_month": att_by_month,
        },
    }
