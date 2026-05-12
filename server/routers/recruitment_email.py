import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import EmailLog, Candidate, Application
from schemas import EmailSendRequest, EmailLogResponse, EmailLogListResponse, PaginationMeta
from services.email_service import send_email

router = APIRouter(prefix="/api/recruitment/email", tags=["Recruitment Email"])


@router.post("/send", response_model=EmailLogResponse, status_code=201)
def send_recruitment_email(data: EmailSendRequest, db: Session = Depends(get_db)):
    """Send an email and log it."""
    candidate = db.query(Candidate).filter(Candidate.id == data.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if not candidate.email:
        raise HTTPException(status_code=400, detail="Candidate has no email address")

    # Send email
    result = send_email(candidate.email, data.subject, data.content)

    # Log email
    log = EmailLog(
        candidate_id=data.candidate_id,
        application_id=data.application_id,
        email_type=data.email_type,
        subject=data.subject,
        content=data.content,
        status="sent" if result["success"] else "failed",
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    if not result["success"]:
        # Still log, but inform about the failure
        pass

    return EmailLogResponse(
        id=log.id,
        candidate_id=log.candidate_id,
        candidate_name=candidate.name,
        application_id=log.application_id,
        email_type=log.email_type,
        subject=log.subject,
        content=log.content,
        status=log.status,
        sent_at=log.sent_at,
    )


@router.get("/logs", response_model=EmailLogListResponse)
def list_email_logs(
    candidate_id: int = Query(None),
    application_id: int = Query(None),
    email_type: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(EmailLog)
    if candidate_id:
        query = query.filter(EmailLog.candidate_id == candidate_id)
    if application_id:
        query = query.filter(EmailLog.application_id == application_id)
    if email_type:
        query = query.filter(EmailLog.email_type == email_type)

    total = query.count()
    items = query.order_by(EmailLog.id.desc()).offset((page - 1) * limit).limit(limit).all()

    data = []
    for log in items:
        data.append(EmailLogResponse(
            id=log.id,
            candidate_id=log.candidate_id,
            candidate_name=log.candidate.name if log.candidate else None,
            application_id=log.application_id,
            email_type=log.email_type,
            subject=log.subject,
            content=log.content,
            status=log.status,
            sent_at=log.sent_at,
        ))

    return EmailLogListResponse(
        data=data,
        pagination=PaginationMeta(page=page, limit=limit, total=total, total_pages=math.ceil(total / limit) if total > 0 else 1),
    )
