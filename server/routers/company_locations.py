from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import CompanyLocation
from schemas import CompanyLocationCreate, CompanyLocationUpdate, CompanyLocationResponse
from auth import get_current_user

router = APIRouter(prefix="/api/company-locations", tags=["Company Locations"])


@router.get("", response_model=list[CompanyLocationResponse])
def list_locations(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    q = db.query(CompanyLocation)
    if active_only:
        q = q.filter(CompanyLocation.is_active == True)
    return q.order_by(CompanyLocation.name).all()


@router.get("/{loc_id}", response_model=CompanyLocationResponse)
def get_location(loc_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    loc = db.query(CompanyLocation).filter(CompanyLocation.id == loc_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return loc


@router.post("", response_model=CompanyLocationResponse, status_code=201)
def create_location(
    data: CompanyLocationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    loc = CompanyLocation(**data.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.put("/{loc_id}", response_model=CompanyLocationResponse)
def update_location(
    loc_id: int,
    data: CompanyLocationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    loc = db.query(CompanyLocation).filter(CompanyLocation.id == loc_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(loc, k, v)
    db.commit()
    db.refresh(loc)
    return loc


@router.delete("/{loc_id}")
def delete_location(
    loc_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    loc = db.query(CompanyLocation).filter(CompanyLocation.id == loc_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    db.delete(loc)
    db.commit()
    return {"message": "Location deleted"}
