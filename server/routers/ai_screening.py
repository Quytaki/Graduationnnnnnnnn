import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import (
    AIScreeningResult, ScreeningTemplate, Application, Candidate,
    RecruitmentRequest, JobPosition
)
from schemas import (
    AIScreeningRequest, AIScreeningResultResponse,
    ScreeningTemplateCreate, ScreeningTemplateUpdate, ScreeningTemplateResponse,
    PaginationMeta,
)
from services.ai_service import extract_text_from_file, run_ai_screening

router = APIRouter(prefix="/api/recruitment/ai", tags=["AI Screening"])


# ── AI Screening ─────────────────────────────────────────

@router.post("/screen", response_model=AIScreeningResultResponse)
def screen_candidate(data: AIScreeningRequest, db: Session = Depends(get_db)):
    """Run AI screening on an application's CV."""
    app = db.query(Application).filter(Application.id == data.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    candidate = app.candidate
    req = app.request

    # Get CV text
    cv_text = ""
    if candidate and candidate.cv_file:
        cv_text = extract_text_from_file(candidate.cv_file)

    if not cv_text:
        cv_text = f"Candidate: {candidate.name}\nEmail: {candidate.email or 'N/A'}\nPhone: {candidate.phone or 'N/A'}"

    # Get job description and requirements
    job_description = req.description or "" if req else ""
    requirements = req.requirements or "" if req else ""

    # Get criteria
    criteria = []
    template_id = data.template_id

    if data.custom_criteria:
        criteria = data.custom_criteria
    elif template_id:
        template = db.query(ScreeningTemplate).filter(ScreeningTemplate.id == template_id).first()
        if template and template.criteria:
            try:
                criteria = json.loads(template.criteria)
            except json.JSONDecodeError:
                criteria = []
    else:
        # Try to find template by job position
        if req and req.job_position_id:
            template = db.query(ScreeningTemplate).filter(
                ScreeningTemplate.job_position_id == req.job_position_id
            ).first()
            if template and template.criteria:
                try:
                    criteria = json.loads(template.criteria)
                    template_id = template.id
                except json.JSONDecodeError:
                    criteria = []

    # Run AI screening
    result = run_ai_screening(cv_text, job_description, requirements, criteria)

    # Save result
    screening = AIScreeningResult(
        application_id=data.application_id,
        score=result.get("score"),
        criteria_breakdown=json.dumps(result.get("criteria_breakdown", []), ensure_ascii=False),
        must_have_check=json.dumps(result.get("must_have_check", {}), ensure_ascii=False),
        summary=result.get("summary", ""),
        recommendation=result.get("recommendation", "Not Fit"),
        screening_template_id=template_id,
    )
    db.add(screening)

    # Update application AI score
    app.ai_score = result.get("score")
    if app.stage == "applied":
        app.stage = "screening"

    db.commit()
    db.refresh(screening)

    return AIScreeningResultResponse(
        id=screening.id,
        application_id=screening.application_id,
        score=screening.score,
        criteria_breakdown=screening.criteria_breakdown,
        must_have_check=screening.must_have_check,
        summary=screening.summary,
        recommendation=screening.recommendation,
        screening_template_id=screening.screening_template_id,
        template_name=screening.template.name if screening.template else None,
        created_at=screening.created_at,
    )


@router.get("/results/{application_id}")
def get_screening_results(application_id: int, db: Session = Depends(get_db)):
    """Get all screening results for an application."""
    results = db.query(AIScreeningResult).filter(
        AIScreeningResult.application_id == application_id
    ).order_by(AIScreeningResult.id.desc()).all()

    return [
        AIScreeningResultResponse(
            id=r.id,
            application_id=r.application_id,
            score=r.score,
            criteria_breakdown=r.criteria_breakdown,
            must_have_check=r.must_have_check,
            summary=r.summary,
            recommendation=r.recommendation,
            screening_template_id=r.screening_template_id,
            template_name=r.template.name if r.template else None,
            created_at=r.created_at,
        )
        for r in results
    ]


# ── Screening Templates ──────────────────────────────────

@router.get("/templates")
def list_templates(
    job_position_id: int = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(ScreeningTemplate)
    if job_position_id:
        query = query.filter(ScreeningTemplate.job_position_id == job_position_id)

    items = query.order_by(ScreeningTemplate.id.desc()).all()

    return [
        ScreeningTemplateResponse(
            id=t.id, name=t.name,
            job_position_id=t.job_position_id,
            criteria=t.criteria,
            job_position_name=t.job_position.name if t.job_position else None,
            created_at=t.created_at, updated_at=t.updated_at,
        )
        for t in items
    ]


@router.post("/templates", response_model=ScreeningTemplateResponse, status_code=201)
def create_template(data: ScreeningTemplateCreate, db: Session = Depends(get_db)):
    t = ScreeningTemplate(
        name=data.name,
        job_position_id=data.job_position_id,
        criteria=data.criteria,
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    return ScreeningTemplateResponse(
        id=t.id, name=t.name,
        job_position_id=t.job_position_id,
        criteria=t.criteria,
        job_position_name=t.job_position.name if t.job_position else None,
        created_at=t.created_at, updated_at=t.updated_at,
    )


@router.put("/templates/{template_id}", response_model=ScreeningTemplateResponse)
def update_template(template_id: int, data: ScreeningTemplateUpdate, db: Session = Depends(get_db)):
    t = db.query(ScreeningTemplate).filter(ScreeningTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(t, key, value)
    db.commit()
    db.refresh(t)

    return ScreeningTemplateResponse(
        id=t.id, name=t.name,
        job_position_id=t.job_position_id,
        criteria=t.criteria,
        job_position_name=t.job_position.name if t.job_position else None,
        created_at=t.created_at, updated_at=t.updated_at,
    )


@router.delete("/templates/{template_id}")
def delete_template(template_id: int, db: Session = Depends(get_db)):
    t = db.query(ScreeningTemplate).filter(ScreeningTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(t)
    db.commit()
    return {"message": "Template deleted successfully"}
