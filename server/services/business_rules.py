"""
Business Rules Service
Centralized validation and workflow logic for the HRM system.
All functions raise HTTPException on validation failure.
"""
from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from models import Employee, Contract, LeaveRequest, LeaveBalance, PayrollSummary, Termination


# ══════════════════════════════════════════════════════════
#  EMPLOYEE ELIGIBILITY
# ══════════════════════════════════════════════════════════

def require_active_employee(db: Session, employee_id: int) -> Employee:
    """Validates that an employee exists and is active. Returns the employee."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Nhan vien khong ton tai")
    if emp.status not in ("active", "draft"):
        raise HTTPException(
            status_code=400,
            detail=f"Nhan vien '{emp.name}' co trang thai '{emp.status}', khong the thuc hien thao tac nay"
        )
    return emp


def require_running_contract(db: Session, employee_id: int, date_str: str = None) -> Contract:
    """Validates that an employee has a running contract. Optionally checks date."""
    q = db.query(Contract).filter(
        Contract.employee_id == employee_id,
        Contract.status == "running",
    )
    if date_str:
        q = q.filter(Contract.start_date <= date_str)
    contract = q.order_by(Contract.id.desc()).first()
    if not contract:
        raise HTTPException(
            status_code=400,
            detail="Nhan vien khong co hop dong dang hieu luc"
        )
    return contract


def is_eligible_for_operations(db: Session, employee_id: int) -> bool:
    """Soft check - returns True/False without raising."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp or emp.status not in ("active",):
        return False
    contract = db.query(Contract).filter(
        Contract.employee_id == employee_id,
        Contract.status == "running",
    ).first()
    return contract is not None


# ══════════════════════════════════════════════════════════
#  CONTRACT VALIDATION
# ══════════════════════════════════════════════════════════

def validate_contract_approval(db: Session, contract: Contract):
    """Validates that a contract can be approved (draft -> running)."""
    if contract.status != "draft":
        raise HTTPException(
            status_code=400,
            detail=f"Chi co the phe duyet hop dong o trang thai 'draft'. Trang thai hien tai: '{contract.status}'"
        )
    # Check no other running contract for this employee
    existing = db.query(Contract).filter(
        Contract.employee_id == contract.employee_id,
        Contract.status == "running",
        Contract.id != contract.id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Nhan vien da co hop dong hieu luc (#{existing.reference or existing.id}). Hay huy hop dong cu truoc."
        )


def validate_contract_delete(db: Session, contract: Contract):
    """Validates that a contract can be deleted."""
    if contract.status == "running":
        raise HTTPException(
            status_code=400,
            detail="Khong the xoa hop dong dang hieu luc. Hay huy hop dong truoc."
        )


def activate_employee_if_needed(db: Session, employee_id: int):
    """Auto-transitions employee from draft to active when contract is approved."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if emp and emp.status == "draft":
        emp.status = "active"


# ══════════════════════════════════════════════════════════
#  LEAVE BALANCE VALIDATION
# ══════════════════════════════════════════════════════════

def validate_leave_balance(db: Session, employee_id: int, leave_type: str, total_days: float, year: int, exclude_id: int = None):
    """Validates that leave request doesn't exceed remaining balance."""
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.year == year,
    ).first()

    if leave_type == "annual":
        remaining = float(balance.annual_remaining) if balance else 12.0
        if total_days > remaining:
            raise HTTPException(
                status_code=400,
                detail=f"So ngay phep con lai: {remaining}. Yeu cau: {total_days} ngay. Vuot qua {total_days - remaining} ngay."
            )
    elif leave_type == "sick":
        total = float(balance.sick_total) if balance else 30.0
        used = float(balance.sick_used) if balance else 0.0
        remaining = total - used
        if total_days > remaining:
            raise HTTPException(
                status_code=400,
                detail=f"So ngay phep benh con lai: {remaining}. Yeu cau: {total_days} ngay."
            )


def validate_leave_no_overlap(db: Session, employee_id: int, start_date: str, end_date: str, exclude_id: int = None):
    """Checks for overlapping leave requests (approved or pending)."""
    q = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee_id,
        LeaveRequest.status.in_(["pending", "approved"]),
        LeaveRequest.start_date <= end_date,
        LeaveRequest.end_date >= start_date,
    )
    if exclude_id:
        q = q.filter(LeaveRequest.id != exclude_id)
    overlap = q.first()
    if overlap:
        raise HTTPException(
            status_code=400,
            detail=f"Trung lich nghi phep voi don #{overlap.id} ({overlap.start_date} - {overlap.end_date})"
        )


def restore_leave_balance(db: Session, leave_request: LeaveRequest):
    """Restores leave balance when a previously-approved leave is cancelled."""
    if leave_request.status != "approved":
        return  # Only restore if was approved

    year = int(leave_request.start_date[:4])
    balance = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == leave_request.employee_id,
        LeaveBalance.year == year,
    ).first()

    if not balance:
        return

    days = float(leave_request.total_days)
    if leave_request.leave_type == "annual":
        balance.annual_used = max(0, float(balance.annual_used or 0) - days)
        balance.annual_remaining = float(balance.annual_total or 12) - float(balance.annual_used)
    elif leave_request.leave_type == "sick":
        balance.sick_used = max(0, float(balance.sick_used or 0) - days)
    elif leave_request.leave_type == "unpaid":
        balance.unpaid_used = max(0, float(balance.unpaid_used or 0) - days)


# ══════════════════════════════════════════════════════════
#  PAYROLL VALIDATION
# ══════════════════════════════════════════════════════════

def validate_payroll_editable(payroll: PayrollSummary):
    """Validates that a payroll record can be edited."""
    if payroll.status == "paid":
        raise HTTPException(
            status_code=400,
            detail="Bang luong da thanh toan, khong the chinh sua."
        )
    if payroll.status == "confirmed":
        raise HTTPException(
            status_code=400,
            detail="Bang luong da xac nhan. Hay mo lai (revert) truoc khi chinh sua."
        )


def validate_payroll_deletable(payroll: PayrollSummary):
    """Validates that a payroll record can be deleted."""
    if payroll.status == "paid":
        raise HTTPException(
            status_code=400,
            detail="Khong the xoa bang luong da thanh toan."
        )
    if payroll.status == "confirmed":
        raise HTTPException(
            status_code=400,
            detail="Khong the xoa bang luong da xac nhan. Hay mo lai truoc."
        )


def validate_payroll_confirm(payroll: PayrollSummary):
    """Validates that payroll can be confirmed."""
    if payroll.status != "draft":
        raise HTTPException(
            status_code=400,
            detail=f"Chi co the xac nhan bang luong o trang thai 'draft'. Trang thai hien tai: '{payroll.status}'"
        )


def validate_payroll_pay(payroll: PayrollSummary):
    """Validates that payroll can be marked as paid."""
    if payroll.status != "confirmed":
        raise HTTPException(
            status_code=400,
            detail=f"Chi co the thanh toan bang luong da 'confirmed'. Trang thai hien tai: '{payroll.status}'"
        )


# ══════════════════════════════════════════════════════════
#  TERMINATION SIDE EFFECTS
# ══════════════════════════════════════════════════════════

def execute_termination_completion(db: Session, termination: Termination):
    """Side effects when termination is completed:
    - Set employee status to 'terminated'
    - Cancel all running contracts
    - Cancel pending leave requests
    """
    emp = db.query(Employee).filter(Employee.id == termination.employee_id).first()
    if emp:
        emp.status = "terminated"

    # Cancel running contracts
    contracts = db.query(Contract).filter(
        Contract.employee_id == termination.employee_id,
        Contract.status == "running",
    ).all()
    for c in contracts:
        c.status = "cancelled"

    # Cancel pending leave requests
    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == termination.employee_id,
        LeaveRequest.status == "pending",
    ).all()
    for lr in leaves:
        lr.status = "cancelled"
