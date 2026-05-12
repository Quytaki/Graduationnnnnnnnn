import math
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from models import Contract, Employee, Department, JobPosition, User
from schemas import (
    ContractCreate, ContractUpdate, ContractResponse,
    ContractListResponse, PaginationMeta
)
from services.business_rules import (
    validate_contract_approval, validate_contract_delete,
    activate_employee_if_needed,
)

router = APIRouter(prefix="/api/contracts", tags=["Contracts"])


def _contract_to_response(c: Contract) -> ContractResponse:
    return ContractResponse(
        id=c.id,
        employee_id=c.employee_id,
        reference=c.reference,
        contract_type=c.contract_type,
        start_date=c.start_date,
        end_date=c.end_date,
        salary=float(c.salary) if c.salary else None,
        wage_type=c.wage_type,
        department_id=c.department_id,
        job_position_id=c.job_position_id,
        status=c.status,
        notes=c.notes,
        employee_name=c.employee.name if c.employee else None,
        department_name=c.department.name if c.department else None,
        job_position_name=c.job_position.name if c.job_position else None,
        approved_by=c.approved_by,
        approved_at=c.approved_at,
        approver_name=c.approver.full_name if c.approver else None,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


@router.get("", response_model=ContractListResponse)
def list_contracts(
    search: str = Query(None),
    employee_id: int = Query(None),
    status: str = Query(None),
    contract_type: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Contract)

    if search:
        pattern = f"%{search}%"
        query = query.join(Employee).filter(
            (Employee.name.ilike(pattern)) | (Contract.reference.ilike(pattern))
        )
    if employee_id:
        query = query.filter(Contract.employee_id == employee_id)
    if status:
        query = query.filter(Contract.status == status)
    if contract_type:
        query = query.filter(Contract.contract_type == contract_type)

    total = query.count()
    contracts = (
        query.order_by(Contract.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return ContractListResponse(
        data=[_contract_to_response(c) for c in contracts],
        pagination=PaginationMeta(
            page=page, limit=limit, total=total,
            total_pages=math.ceil(total / limit) if total > 0 else 1,
        ),
    )


@router.get("/{contract_id}", response_model=ContractResponse)
def get_contract(contract_id: int, db: Session = Depends(get_db)):
    c = db.query(Contract).filter(Contract.id == contract_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")
    return _contract_to_response(c)


@router.post("", response_model=ContractResponse, status_code=201)
def create_contract(data: ContractCreate, db: Session = Depends(get_db)):
    # Validate employee exists
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=400, detail="Employee not found")

    # Auto-generate reference if not provided
    ref = data.reference
    if not ref:
        count = db.query(Contract).count() + 1
        ref = f"CTR-{data.start_date[:4]}-{count:03d}"

    # New contracts always start as draft
    c = Contract(
        employee_id=data.employee_id,
        reference=ref,
        contract_type=data.contract_type,
        start_date=data.start_date,
        end_date=data.end_date,
        salary=data.salary,
        wage_type=data.wage_type,
        department_id=data.department_id or emp.department_id,
        job_position_id=data.job_position_id or emp.job_position_id,
        status="draft",
        notes=data.notes,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _contract_to_response(c)


@router.put("/{contract_id}", response_model=ContractResponse)
def update_contract(contract_id: int, data: ContractUpdate, db: Session = Depends(get_db)):
    c = db.query(Contract).filter(Contract.id == contract_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")

    # Cannot edit running contracts (must cancel first)
    if c.status == "running":
        update_data = data.model_dump(exclude_unset=True)
        # Allow only status and notes changes for running contracts
        allowed_running = {"status", "notes"}
        forbidden = set(update_data.keys()) - allowed_running
        if forbidden:
            raise HTTPException(
                status_code=400,
                detail=f"Khong the sua hop dong dang hieu luc. Chi co the thay doi: {', '.join(allowed_running)}"
            )

    update_data = data.model_dump(exclude_unset=True)
    # Prevent direct status change to 'running' via update (must use approve endpoint)
    if "status" in update_data and update_data["status"] == "running" and c.status == "draft":
        raise HTTPException(
            status_code=400,
            detail="Su dung endpoint /approve de phe duyet hop dong"
        )

    for key, value in update_data.items():
        setattr(c, key, value)

    db.commit()
    db.refresh(c)
    return _contract_to_response(c)


# ── Contract Approval ────────────────────────────────────

@router.put("/{contract_id}/approve", response_model=ContractResponse)
def approve_contract(
    contract_id: int,
    action: str = Query(..., pattern="^(running|draft)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Approve a contract (draft -> running) or reject (send back to draft).
    When approved: auto-activates employee if currently in 'draft' status.
    """
    c = db.query(Contract).filter(Contract.id == contract_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")

    if action == "running":
        validate_contract_approval(db, c)
        c.status = "running"
        c.approved_by = current_user.id
        c.approved_at = datetime.now()
        # Side effect: activate employee
        activate_employee_if_needed(db, c.employee_id)
    elif action == "draft":
        if c.status not in ("running",):
            raise HTTPException(status_code=400, detail="Chi co the hoan ve 'draft' tu trang thai 'running'")
        c.status = "draft"
        c.approved_by = None
        c.approved_at = None

    db.commit()
    db.refresh(c)
    return _contract_to_response(c)


@router.delete("/{contract_id}")
def delete_contract(contract_id: int, db: Session = Depends(get_db)):
    c = db.query(Contract).filter(Contract.id == contract_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contract not found")
    validate_contract_delete(db, c)
    db.delete(c)
    db.commit()
    return {"message": "Contract deleted successfully"}
