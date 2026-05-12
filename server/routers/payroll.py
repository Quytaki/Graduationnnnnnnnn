import math
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import PayrollSummary, Employee, WorkingHour, IncentiveRate, Contract, User
from schemas import (
    PayrollSummaryCreate, PayrollSummaryUpdate, PayrollSummaryResponse,
    PayrollSummaryListResponse, PaginationMeta
)
from services.business_rules import (
    validate_payroll_editable, validate_payroll_deletable,
    validate_payroll_confirm, validate_payroll_pay,
    is_eligible_for_operations,
)

router = APIRouter(prefix="/api/payroll", tags=["Payroll Summary"])


def _ps_to_response(ps: PayrollSummary) -> PayrollSummaryResponse:
    emp = ps.employee
    return PayrollSummaryResponse(
        id=ps.id,
        employee_id=ps.employee_id,
        period=ps.period,
        base_salary=float(ps.base_salary or 0),
        overtime_pay=float(ps.overtime_pay or 0),
        incentive_total=float(ps.incentive_total or 0),
        deductions=float(ps.deductions or 0),
        gross_salary=float(ps.gross_salary or 0),
        net_salary=float(ps.net_salary or 0),
        status=ps.status,
        notes=ps.notes,
        employee_name=emp.name if emp else None,
        department_name=emp.department.name if emp and emp.department else None,
        job_position_name=emp.job_position.name if emp and emp.job_position else None,
        confirmed_by=ps.confirmed_by,
        confirmed_at=ps.confirmed_at,
        paid_at=ps.paid_at,
        confirmer_name=ps.confirmer.full_name if ps.confirmer else None,
        created_at=ps.created_at,
        updated_at=ps.updated_at,
    )


@router.get("", response_model=PayrollSummaryListResponse)
def list_payroll(
    search: str = Query(None),
    employee_id: int = Query(None),
    period: str = Query(None),
    status: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(PayrollSummary)
    if search:
        query = query.join(Employee).filter(Employee.name.ilike(f"%{search}%"))
    if employee_id:
        query = query.filter(PayrollSummary.employee_id == employee_id)
    if period:
        query = query.filter(PayrollSummary.period == period)
    if status:
        query = query.filter(PayrollSummary.status == status)

    total = query.count()
    items = query.order_by(PayrollSummary.id.desc()).offset((page - 1) * limit).limit(limit).all()

    return PayrollSummaryListResponse(
        data=[_ps_to_response(ps) for ps in items],
        pagination=PaginationMeta(
            page=page, limit=limit, total=total,
            total_pages=math.ceil(total / limit) if total > 0 else 1,
        ),
    )


@router.get("/{ps_id}", response_model=PayrollSummaryResponse)
def get_payroll(ps_id: int, db: Session = Depends(get_db)):
    ps = db.query(PayrollSummary).filter(PayrollSummary.id == ps_id).first()
    if not ps:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    return _ps_to_response(ps)


@router.post("/calculate", response_model=PayrollSummaryResponse, status_code=201)
def calculate_payroll(
    employee_id: int = Query(...),
    period: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Auto-calculate payroll for an employee in a given period.
    Requires employee to have a running contract.
    """
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=400, detail="Employee not found")

    if emp.status not in ("active",):
        raise HTTPException(status_code=400, detail=f"Nhan vien '{emp.name}' khong o trang thai 'active'")

    # Get base salary from latest running contract
    contract = db.query(Contract).filter(
        Contract.employee_id == employee_id,
        Contract.status == "running"
    ).order_by(Contract.id.desc()).first()

    if not contract:
        raise HTTPException(status_code=400, detail=f"Nhan vien '{emp.name}' khong co hop dong hieu luc")

    base_salary = float(contract.salary) if contract and contract.salary else 0

    # Get working hours for the period
    wh = db.query(WorkingHour).filter(
        WorkingHour.employee_id == employee_id,
        WorkingHour.period == period
    ).first()

    overtime_hours = float(wh.overtime_hours) if wh and wh.overtime_hours else 0
    standard_hours = float(wh.standard_hours) if wh and wh.standard_hours else 176

    # Calculate overtime pay (1.5x hourly rate)
    hourly_rate = base_salary / standard_hours if standard_hours > 0 else 0
    overtime_pay = round(overtime_hours * hourly_rate * 1.5, 2)

    # Calculate incentive total
    incentives = db.query(IncentiveRate).filter(IncentiveRate.is_active == "active").all()
    incentive_total = 0.0
    for inc in incentives:
        if inc.applicable_to == "all":
            pass
        elif inc.applicable_to == "department" and inc.department_id != emp.department_id:
            continue
        elif inc.applicable_to == "position" and inc.job_position_id != emp.job_position_id:
            continue

        if inc.rate_type == "fixed":
            incentive_total += float(inc.rate_value)
        elif inc.rate_type == "percentage":
            incentive_total += base_salary * float(inc.rate_value) / 100
        elif inc.rate_type == "per_hour":
            actual_hours = float(wh.actual_hours) if wh and wh.actual_hours else standard_hours
            incentive_total += float(inc.rate_value) * actual_hours

    incentive_total = round(incentive_total, 2)
    gross_salary = round(base_salary + overtime_pay + incentive_total, 2)
    deductions = round(base_salary * 0.105, 2)
    net_salary = round(gross_salary - deductions, 2)

    # Check if record exists
    existing = db.query(PayrollSummary).filter(
        PayrollSummary.employee_id == employee_id,
        PayrollSummary.period == period
    ).first()

    if existing:
        # Can only re-calculate draft payrolls
        validate_payroll_editable(existing)
        existing.base_salary = base_salary
        existing.overtime_pay = overtime_pay
        existing.incentive_total = incentive_total
        existing.deductions = deductions
        existing.gross_salary = gross_salary
        existing.net_salary = net_salary
        db.commit()
        db.refresh(existing)
        return _ps_to_response(existing)
    else:
        ps = PayrollSummary(
            employee_id=employee_id, period=period,
            base_salary=base_salary, overtime_pay=overtime_pay,
            incentive_total=incentive_total, deductions=deductions,
            gross_salary=gross_salary, net_salary=net_salary,
            status="draft",
        )
        db.add(ps)
        db.commit()
        db.refresh(ps)
        return _ps_to_response(ps)


# ── Payroll Confirm/Pay ──────────────────────────────────

@router.put("/{ps_id}/confirm", response_model=PayrollSummaryResponse)
def confirm_payroll(
    ps_id: int,
    action: str = Query(..., pattern="^(confirmed|draft)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirm payroll (draft -> confirmed) or revert (confirmed -> draft)."""
    ps = db.query(PayrollSummary).filter(PayrollSummary.id == ps_id).first()
    if not ps:
        raise HTTPException(status_code=404, detail="Payroll record not found")

    if action == "confirmed":
        validate_payroll_confirm(ps)
        ps.status = "confirmed"
        ps.confirmed_by = current_user.id
        ps.confirmed_at = datetime.now()
    elif action == "draft":
        if ps.status == "paid":
            raise HTTPException(status_code=400, detail="Khong the hoan bang luong da thanh toan")
        if ps.status != "confirmed":
            raise HTTPException(status_code=400, detail="Chi co the hoan ve 'draft' tu trang thai 'confirmed'")
        ps.status = "draft"
        ps.confirmed_by = None
        ps.confirmed_at = None

    db.commit()
    db.refresh(ps)
    return _ps_to_response(ps)


@router.put("/{ps_id}/mark-paid", response_model=PayrollSummaryResponse)
def mark_payroll_paid(
    ps_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark confirmed payroll as paid. This is irreversible."""
    ps = db.query(PayrollSummary).filter(PayrollSummary.id == ps_id).first()
    if not ps:
        raise HTTPException(status_code=404, detail="Payroll record not found")

    validate_payroll_pay(ps)
    ps.status = "paid"
    ps.paid_at = datetime.now()
    db.commit()
    db.refresh(ps)
    return _ps_to_response(ps)


# ── Bulk Calculate ───────────────────────────────────────

@router.post("/calculate-all")
def calculate_all_payroll(
    period: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate payroll for all eligible (active + running contract) employees."""
    employees = db.query(Employee).filter(Employee.status == "active").all()
    calculated = 0
    skipped = 0
    errors = []

    for emp in employees:
        if not is_eligible_for_operations(db, emp.id):
            skipped += 1
            continue

        # Check if already exists and is locked
        existing = db.query(PayrollSummary).filter(
            PayrollSummary.employee_id == emp.id,
            PayrollSummary.period == period,
        ).first()
        if existing and existing.status in ("confirmed", "paid"):
            skipped += 1
            continue

        try:
            contract = db.query(Contract).filter(
                Contract.employee_id == emp.id, Contract.status == "running"
            ).order_by(Contract.id.desc()).first()
            if not contract or not contract.salary:
                skipped += 1
                continue

            base_salary = float(contract.salary)
            wh = db.query(WorkingHour).filter(
                WorkingHour.employee_id == emp.id, WorkingHour.period == period
            ).first()

            overtime_hours = float(wh.overtime_hours) if wh else 0
            standard_hours = float(wh.standard_hours) if wh else 176
            hourly_rate = base_salary / standard_hours if standard_hours > 0 else 0
            overtime_pay = round(overtime_hours * hourly_rate * 1.5, 2)

            incentives = db.query(IncentiveRate).filter(IncentiveRate.is_active == "active").all()
            incentive_total = 0.0
            for inc in incentives:
                if inc.applicable_to == "department" and inc.department_id != emp.department_id:
                    continue
                if inc.applicable_to == "position" and inc.job_position_id != emp.job_position_id:
                    continue
                if inc.rate_type == "fixed":
                    incentive_total += float(inc.rate_value)
                elif inc.rate_type == "percentage":
                    incentive_total += base_salary * float(inc.rate_value) / 100

            gross = round(base_salary + overtime_pay + incentive_total, 2)
            deductions = round(base_salary * 0.105, 2)
            net = round(gross - deductions, 2)

            if existing:
                existing.base_salary = base_salary
                existing.overtime_pay = overtime_pay
                existing.incentive_total = round(incentive_total, 2)
                existing.deductions = deductions
                existing.gross_salary = gross
                existing.net_salary = net
            else:
                ps = PayrollSummary(
                    employee_id=emp.id, period=period,
                    base_salary=base_salary, overtime_pay=overtime_pay,
                    incentive_total=round(incentive_total, 2), deductions=deductions,
                    gross_salary=gross, net_salary=net, status="draft",
                )
                db.add(ps)
            calculated += 1
        except Exception as e:
            errors.append(f"{emp.name}: {str(e)}")

    db.commit()
    return {"calculated": calculated, "skipped": skipped, "errors": errors}


@router.post("", response_model=PayrollSummaryResponse, status_code=201)
def create_payroll(data: PayrollSummaryCreate, db: Session = Depends(get_db)):
    ps = PayrollSummary(**data.model_dump())
    db.add(ps)
    db.commit()
    db.refresh(ps)
    return _ps_to_response(ps)


@router.put("/{ps_id}", response_model=PayrollSummaryResponse)
def update_payroll(ps_id: int, data: PayrollSummaryUpdate, db: Session = Depends(get_db)):
    ps = db.query(PayrollSummary).filter(PayrollSummary.id == ps_id).first()
    if not ps:
        raise HTTPException(status_code=404, detail="Payroll record not found")

    # Business rule: lock
    validate_payroll_editable(ps)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(ps, key, value)
    db.commit()
    db.refresh(ps)
    return _ps_to_response(ps)


@router.delete("/{ps_id}")
def delete_payroll(ps_id: int, db: Session = Depends(get_db)):
    ps = db.query(PayrollSummary).filter(PayrollSummary.id == ps_id).first()
    if not ps:
        raise HTTPException(status_code=404, detail="Payroll record not found")

    # Business rule: lock
    validate_payroll_deletable(ps)

    db.delete(ps)
    db.commit()
    return {"message": "Payroll record deleted"}
