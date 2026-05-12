import math
import os
import random
import json
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import (
    Candidate, RecruitmentRequest, Application, Interview, Offer,
    Department, JobPosition, Employee, User
)
from schemas import (
    CandidateCreate, CandidateUpdate, CandidateResponse, CandidateListResponse,
    RecruitmentRequestCreate, RecruitmentRequestUpdate, RecruitmentRequestResponse, RecruitmentRequestListResponse,
    ApplicationCreate, ApplicationUpdate, ApplicationResponse, ApplicationListResponse,
    InterviewCreate, InterviewUpdate, InterviewResponse, InterviewListResponse,
    OfferCreate, OfferUpdate, OfferResponse, OfferListResponse,
    PaginationMeta,
)
from auth import get_current_user

router = APIRouter(prefix="/api/recruitment", tags=["Recruitment"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads", "cv")
os.makedirs(UPLOAD_DIR, exist_ok=True)

AVATAR_COLORS = [
    "#714B67", "#00A09D", "#4A90A4", "#D97706", "#059669",
    "#7C3AED", "#DC2626", "#EC4899", "#0891B2", "#8B5CF6",
]

# ── Helper Functions ──────────────────────────────────────

def _candidate_to_response(c: Candidate) -> CandidateResponse:
    return CandidateResponse(
        id=c.id, name=c.name, email=c.email, phone=c.phone,
        source=c.source or "other", cv_file=c.cv_file, notes=c.notes,
        application_count=len(c.applications) if c.applications else 0,
        created_at=c.created_at, updated_at=c.updated_at,
    )


def _request_to_response(r: RecruitmentRequest) -> RecruitmentRequestResponse:
    return RecruitmentRequestResponse(
        id=r.id, title=r.title,
        department_id=r.department_id, job_position_id=r.job_position_id,
        quantity=r.quantity, description=r.description,
        requirements=r.requirements, status=r.status,
        department_name=r.department.name if r.department else None,
        job_position_name=r.job_position.name if r.job_position else None,
        creator_name=r.creator.full_name if r.creator else None,
        application_count=len(r.applications) if r.applications else 0,
        created_at=r.created_at, updated_at=r.updated_at,
    )


def _application_to_response(a: Application) -> ApplicationResponse:
    req = a.request
    return ApplicationResponse(
        id=a.id, candidate_id=a.candidate_id, request_id=a.request_id,
        stage=a.stage, ai_score=a.ai_score, notes=a.notes,
        candidate_name=a.candidate.name if a.candidate else None,
        candidate_email=a.candidate.email if a.candidate else None,
        candidate_phone=a.candidate.phone if a.candidate else None,
        candidate_cv=a.candidate.cv_file if a.candidate else None,
        request_title=req.title if req else None,
        position_name=req.job_position.name if req and req.job_position else None,
        department_name=req.department.name if req and req.department else None,
        applied_at=a.applied_at, updated_at=a.updated_at,
    )


def _interview_to_response(i: Interview) -> InterviewResponse:
    app = i.application
    return InterviewResponse(
        id=i.id, application_id=i.application_id,
        interviewer_id=i.interviewer_id,
        scheduled_at=i.scheduled_at.isoformat() if i.scheduled_at else "",
        duration_minutes=i.duration_minutes or 60,
        interview_type=i.interview_type or "offline",
        location=i.location, notes=i.notes, result=i.result or "pending",
        candidate_name=app.candidate.name if app and app.candidate else None,
        interviewer_name=i.interviewer.name if i.interviewer else None,
        position_name=app.request.job_position.name if app and app.request and app.request.job_position else None,
        created_at=i.created_at, updated_at=i.updated_at,
    )


def _offer_to_response(o: Offer) -> OfferResponse:
    app = o.application
    return OfferResponse(
        id=o.id, application_id=o.application_id,
        salary=float(o.salary) if o.salary else None,
        start_date=o.start_date, status=o.status, notes=o.notes,
        candidate_name=app.candidate.name if app and app.candidate else None,
        position_name=app.request.job_position.name if app and app.request and app.request.job_position else None,
        department_name=app.request.department.name if app and app.request and app.request.department else None,
        created_at=o.created_at, updated_at=o.updated_at,
    )


# ══════════════════════════════════════════════════════════
# CANDIDATES
# ══════════════════════════════════════════════════════════

@router.get("/candidates", response_model=CandidateListResponse)
def list_candidates(
    search: str = Query(None),
    source: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Candidate)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (Candidate.name.ilike(pattern)) | (Candidate.email.ilike(pattern)) | (Candidate.phone.ilike(pattern))
        )
    if source:
        query = query.filter(Candidate.source == source)

    total = query.count()
    items = query.order_by(Candidate.id.desc()).offset((page - 1) * limit).limit(limit).all()

    return CandidateListResponse(
        data=[_candidate_to_response(c) for c in items],
        pagination=PaginationMeta(page=page, limit=limit, total=total, total_pages=math.ceil(total / limit) if total > 0 else 1),
    )


@router.get("/candidates/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return _candidate_to_response(c)


@router.post("/candidates", response_model=CandidateResponse, status_code=201)
def create_candidate(data: CandidateCreate, db: Session = Depends(get_db)):
    c = Candidate(name=data.name, email=data.email, phone=data.phone, source=data.source, notes=data.notes)
    db.add(c)
    db.commit()
    db.refresh(c)
    return _candidate_to_response(c)


@router.post("/candidates/upload", response_model=CandidateResponse, status_code=201)
async def upload_candidate_cv(
    name: str = Form(...),
    email: str = Form(None),
    phone: str = Form(None),
    source: str = Form("other"),
    notes: str = Form(None),
    cv: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Save CV file
    ext = os.path.splitext(cv.filename)[1] if cv.filename else ".pdf"
    filename = f"cv_{int(datetime.now().timestamp())}_{name.replace(' ', '_')}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        content = await cv.read()
        f.write(content)

    c = Candidate(name=name, email=email, phone=phone, source=source, notes=notes, cv_file=filepath)
    db.add(c)
    db.commit()
    db.refresh(c)
    return _candidate_to_response(c)


@router.put("/candidates/{candidate_id}", response_model=CandidateResponse)
def update_candidate(candidate_id: int, data: CandidateUpdate, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(c, key, value)
    db.commit()
    db.refresh(c)
    return _candidate_to_response(c)


@router.delete("/candidates/{candidate_id}")
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    # Delete CV file if exists
    if c.cv_file and os.path.exists(c.cv_file):
        try:
            os.remove(c.cv_file)
        except Exception:
            pass
    db.delete(c)
    db.commit()
    return {"message": "Candidate deleted successfully"}


# ══════════════════════════════════════════════════════════
# RECRUITMENT REQUESTS
# ══════════════════════════════════════════════════════════

@router.get("/requests", response_model=RecruitmentRequestListResponse)
def list_requests(
    search: str = Query(None),
    status: str = Query(None),
    department_id: int = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(RecruitmentRequest)
    if search:
        pattern = f"%{search}%"
        query = query.filter(RecruitmentRequest.title.ilike(pattern))
    if status:
        query = query.filter(RecruitmentRequest.status == status)
    if department_id:
        query = query.filter(RecruitmentRequest.department_id == department_id)

    total = query.count()
    items = query.order_by(RecruitmentRequest.id.desc()).offset((page - 1) * limit).limit(limit).all()

    return RecruitmentRequestListResponse(
        data=[_request_to_response(r) for r in items],
        pagination=PaginationMeta(page=page, limit=limit, total=total, total_pages=math.ceil(total / limit) if total > 0 else 1),
    )


@router.get("/requests/{request_id}", response_model=RecruitmentRequestResponse)
def get_request(request_id: int, db: Session = Depends(get_db)):
    r = db.query(RecruitmentRequest).filter(RecruitmentRequest.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recruitment request not found")
    return _request_to_response(r)


@router.post("/requests", response_model=RecruitmentRequestResponse, status_code=201)
def create_request(data: RecruitmentRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = RecruitmentRequest(
        title=data.title, department_id=data.department_id, job_position_id=data.job_position_id,
        quantity=data.quantity, description=data.description, requirements=data.requirements,
        status=data.status or "pending", created_by=current_user.id,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _request_to_response(r)


@router.put("/requests/{request_id}", response_model=RecruitmentRequestResponse)
def update_request(request_id: int, data: RecruitmentRequestUpdate, db: Session = Depends(get_db)):
    r = db.query(RecruitmentRequest).filter(RecruitmentRequest.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recruitment request not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(r, key, value)
    db.commit()
    db.refresh(r)
    return _request_to_response(r)


@router.put("/requests/{request_id}/approve")
def approve_request(request_id: int, action: str = Query(...), db: Session = Depends(get_db)):
    r = db.query(RecruitmentRequest).filter(RecruitmentRequest.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recruitment request not found")
    if action not in ("approved", "closed", "pending"):
        raise HTTPException(status_code=400, detail="Invalid action")
    r.status = action
    db.commit()
    return {"message": f"Request status updated to {action}"}


@router.delete("/requests/{request_id}")
def delete_request(request_id: int, db: Session = Depends(get_db)):
    r = db.query(RecruitmentRequest).filter(RecruitmentRequest.id == request_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Recruitment request not found")
    db.delete(r)
    db.commit()
    return {"message": "Recruitment request deleted successfully"}


# ══════════════════════════════════════════════════════════
# APPLICATIONS
# ══════════════════════════════════════════════════════════

@router.get("/applications", response_model=ApplicationListResponse)
def list_applications(
    search: str = Query(None),
    stage: str = Query(None),
    request_id: int = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(Application)
    if search:
        pattern = f"%{search}%"
        query = query.join(Candidate).filter(
            (Candidate.name.ilike(pattern)) | (Candidate.email.ilike(pattern))
        )
    if stage:
        query = query.filter(Application.stage == stage)
    if request_id:
        query = query.filter(Application.request_id == request_id)

    total = query.count()
    items = query.order_by(Application.id.desc()).offset((page - 1) * limit).limit(limit).all()

    return ApplicationListResponse(
        data=[_application_to_response(a) for a in items],
        pagination=PaginationMeta(page=page, limit=limit, total=total, total_pages=math.ceil(total / limit) if total > 0 else 1),
    )


@router.get("/applications/{app_id}", response_model=ApplicationResponse)
def get_application(app_id: int, db: Session = Depends(get_db)):
    a = db.query(Application).filter(Application.id == app_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Application not found")
    return _application_to_response(a)


@router.post("/applications", response_model=ApplicationResponse, status_code=201)
def create_application(data: ApplicationCreate, db: Session = Depends(get_db)):
    # Validate candidate and request exist
    if not db.query(Candidate).filter(Candidate.id == data.candidate_id).first():
        raise HTTPException(status_code=404, detail="Candidate not found")
    if not db.query(RecruitmentRequest).filter(RecruitmentRequest.id == data.request_id).first():
        raise HTTPException(status_code=404, detail="Recruitment request not found")

    a = Application(
        candidate_id=data.candidate_id, request_id=data.request_id,
        stage=data.stage or "applied", notes=data.notes,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return _application_to_response(a)


@router.put("/applications/{app_id}", response_model=ApplicationResponse)
def update_application(app_id: int, data: ApplicationUpdate, db: Session = Depends(get_db)):
    a = db.query(Application).filter(Application.id == app_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Application not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(a, key, value)
    db.commit()
    db.refresh(a)
    return _application_to_response(a)


@router.put("/applications/{app_id}/stage")
def update_application_stage(app_id: int, stage: str = Query(...), db: Session = Depends(get_db)):
    valid_stages = ["applied", "screening", "interview", "offer", "hired", "rejected"]
    if stage not in valid_stages:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {valid_stages}")

    a = db.query(Application).filter(Application.id == app_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Application not found")
    a.stage = stage
    db.commit()
    return {"message": f"Application stage updated to {stage}"}


@router.post("/applications/{app_id}/hire")
def hire_application(app_id: int, db: Session = Depends(get_db)):
    """Convert an application to an Employee record."""
    a = db.query(Application).filter(Application.id == app_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Application not found")

    candidate = a.candidate
    req = a.request

    # Create employee from candidate
    emp = Employee(
        name=candidate.name,
        email=candidate.email,
        phone=candidate.phone,
        department_id=req.department_id if req else None,
        job_position_id=req.job_position_id if req else None,
        status="active",
        avatar_color=random.choice(AVATAR_COLORS),
        role="staff",
        hire_date=datetime.now().strftime("%Y-%m-%d"),
    )
    db.add(emp)

    # Update application stage
    a.stage = "hired"
    db.commit()
    db.refresh(emp)

    return {"message": f"Employee '{emp.name}' created successfully", "employee_id": emp.id}


@router.delete("/applications/{app_id}")
def delete_application(app_id: int, db: Session = Depends(get_db)):
    a = db.query(Application).filter(Application.id == app_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(a)
    db.commit()
    return {"message": "Application deleted successfully"}


# ══════════════════════════════════════════════════════════
# INTERVIEWS
# ══════════════════════════════════════════════════════════

@router.get("/interviews", response_model=InterviewListResponse)
def list_interviews(
    search: str = Query(None),
    result: str = Query(None),
    application_id: int = Query(None),
    date_from: str = Query(None),
    date_to: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Interview)
    if application_id:
        query = query.filter(Interview.application_id == application_id)
    if result:
        query = query.filter(Interview.result == result)
    if search:
        pattern = f"%{search}%"
        query = query.join(Application).join(Candidate).filter(Candidate.name.ilike(pattern))
    if date_from:
        query = query.filter(Interview.scheduled_at >= date_from)
    if date_to:
        query = query.filter(Interview.scheduled_at <= date_to + " 23:59:59")

    total = query.count()
    items = query.order_by(Interview.scheduled_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return InterviewListResponse(
        data=[_interview_to_response(i) for i in items],
        pagination=PaginationMeta(page=page, limit=limit, total=total, total_pages=math.ceil(total / limit) if total > 0 else 1),
    )


@router.get("/interviews/{interview_id}", response_model=InterviewResponse)
def get_interview(interview_id: int, db: Session = Depends(get_db)):
    i = db.query(Interview).filter(Interview.id == interview_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Interview not found")
    return _interview_to_response(i)


@router.post("/interviews", response_model=InterviewResponse, status_code=201)
def create_interview(data: InterviewCreate, db: Session = Depends(get_db)):
    if not db.query(Application).filter(Application.id == data.application_id).first():
        raise HTTPException(status_code=404, detail="Application not found")

    i = Interview(
        application_id=data.application_id,
        interviewer_id=data.interviewer_id,
        scheduled_at=datetime.fromisoformat(data.scheduled_at),
        duration_minutes=data.duration_minutes,
        interview_type=data.interview_type,
        location=data.location,
        notes=data.notes,
        result=data.result or "pending",
    )
    db.add(i)
    db.commit()
    db.refresh(i)
    return _interview_to_response(i)


@router.put("/interviews/{interview_id}", response_model=InterviewResponse)
def update_interview(interview_id: int, data: InterviewUpdate, db: Session = Depends(get_db)):
    i = db.query(Interview).filter(Interview.id == interview_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Interview not found")

    update_data = data.model_dump(exclude_unset=True)
    if "scheduled_at" in update_data and update_data["scheduled_at"]:
        update_data["scheduled_at"] = datetime.fromisoformat(update_data["scheduled_at"])

    for key, value in update_data.items():
        setattr(i, key, value)
    db.commit()
    db.refresh(i)
    return _interview_to_response(i)


@router.delete("/interviews/{interview_id}")
def delete_interview(interview_id: int, db: Session = Depends(get_db)):
    i = db.query(Interview).filter(Interview.id == interview_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Interview not found")
    db.delete(i)
    db.commit()
    return {"message": "Interview deleted successfully"}


# ══════════════════════════════════════════════════════════
# OFFERS
# ══════════════════════════════════════════════════════════

@router.get("/offers", response_model=OfferListResponse)
def list_offers(
    search: str = Query(None),
    status: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(Offer)
    if status:
        query = query.filter(Offer.status == status)
    if search:
        pattern = f"%{search}%"
        query = query.join(Application).join(Candidate).filter(Candidate.name.ilike(pattern))

    total = query.count()
    items = query.order_by(Offer.id.desc()).offset((page - 1) * limit).limit(limit).all()

    return OfferListResponse(
        data=[_offer_to_response(o) for o in items],
        pagination=PaginationMeta(page=page, limit=limit, total=total, total_pages=math.ceil(total / limit) if total > 0 else 1),
    )


@router.post("/offers", response_model=OfferResponse, status_code=201)
def create_offer(data: OfferCreate, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == data.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    o = Offer(
        application_id=data.application_id,
        salary=data.salary, start_date=data.start_date,
        status=data.status or "pending", notes=data.notes,
    )
    db.add(o)

    # Auto-move application to offer stage
    if app.stage not in ("offer", "hired"):
        app.stage = "offer"

    db.commit()
    db.refresh(o)
    return _offer_to_response(o)


@router.put("/offers/{offer_id}", response_model=OfferResponse)
def update_offer(offer_id: int, data: OfferUpdate, db: Session = Depends(get_db)):
    o = db.query(Offer).filter(Offer.id == offer_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Offer not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(o, key, value)
    db.commit()
    db.refresh(o)
    return _offer_to_response(o)


@router.put("/offers/{offer_id}/status")
def update_offer_status(offer_id: int, status: str = Query(...), db: Session = Depends(get_db)):
    if status not in ("pending", "accepted", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid status")
    o = db.query(Offer).filter(Offer.id == offer_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Offer not found")
    o.status = status
    db.commit()
    return {"message": f"Offer status updated to {status}"}


@router.delete("/offers/{offer_id}")
def delete_offer(offer_id: int, db: Session = Depends(get_db)):
    o = db.query(Offer).filter(Offer.id == offer_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Offer not found")
    db.delete(o)
    db.commit()
    return {"message": "Offer deleted successfully"}
