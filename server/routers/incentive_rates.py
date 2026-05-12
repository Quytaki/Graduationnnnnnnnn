import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import IncentiveRate, Department, JobPosition
from schemas import (
    IncentiveRateCreate, IncentiveRateUpdate, IncentiveRateResponse,
    IncentiveRateListResponse, PaginationMeta
)

router = APIRouter(prefix="/api/incentive-rates", tags=["Incentive Rates"])


def _ir_to_response(ir: IncentiveRate) -> IncentiveRateResponse:
    return IncentiveRateResponse(
        id=ir.id,
        name=ir.name,
        code=ir.code,
        rate_type=ir.rate_type,
        rate_value=float(ir.rate_value),
        description=ir.description,
        applicable_to=ir.applicable_to,
        department_id=ir.department_id,
        job_position_id=ir.job_position_id,
        is_active=ir.is_active,
        department_name=ir.department.name if ir.department else None,
        job_position_name=ir.job_position.name if ir.job_position else None,
        created_at=ir.created_at,
        updated_at=ir.updated_at,
    )


@router.get("", response_model=IncentiveRateListResponse)
def list_incentive_rates(
    search: str = Query(None),
    rate_type: str = Query(None),
    is_active: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(IncentiveRate)
    if search:
        query = query.filter(
            (IncentiveRate.name.ilike(f"%{search}%")) | (IncentiveRate.code.ilike(f"%{search}%"))
        )
    if rate_type:
        query = query.filter(IncentiveRate.rate_type == rate_type)
    if is_active:
        query = query.filter(IncentiveRate.is_active == is_active)

    total = query.count()
    items = query.order_by(IncentiveRate.id.desc()).offset((page - 1) * limit).limit(limit).all()

    return IncentiveRateListResponse(
        data=[_ir_to_response(ir) for ir in items],
        pagination=PaginationMeta(
            page=page, limit=limit, total=total,
            total_pages=math.ceil(total / limit) if total > 0 else 1,
        ),
    )


@router.get("/{ir_id}", response_model=IncentiveRateResponse)
def get_incentive_rate(ir_id: int, db: Session = Depends(get_db)):
    ir = db.query(IncentiveRate).filter(IncentiveRate.id == ir_id).first()
    if not ir:
        raise HTTPException(status_code=404, detail="Incentive rate not found")
    return _ir_to_response(ir)


@router.post("", response_model=IncentiveRateResponse, status_code=201)
def create_incentive_rate(data: IncentiveRateCreate, db: Session = Depends(get_db)):
    ir = IncentiveRate(**data.model_dump())
    db.add(ir)
    db.commit()
    db.refresh(ir)
    return _ir_to_response(ir)


@router.put("/{ir_id}", response_model=IncentiveRateResponse)
def update_incentive_rate(ir_id: int, data: IncentiveRateUpdate, db: Session = Depends(get_db)):
    ir = db.query(IncentiveRate).filter(IncentiveRate.id == ir_id).first()
    if not ir:
        raise HTTPException(status_code=404, detail="Incentive rate not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(ir, key, value)
    db.commit()
    db.refresh(ir)
    return _ir_to_response(ir)


@router.delete("/{ir_id}")
def delete_incentive_rate(ir_id: int, db: Session = Depends(get_db)):
    ir = db.query(IncentiveRate).filter(IncentiveRate.id == ir_id).first()
    if not ir:
        raise HTTPException(status_code=404, detail="Incentive rate not found")
    db.delete(ir)
    db.commit()
    return {"message": "Incentive rate deleted"}
