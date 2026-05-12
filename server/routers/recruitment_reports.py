from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from database import get_db
from models import Application, Candidate, RecruitmentRequest
from schemas import RecruitmentReportResponse, PipelineStageCount, ConversionRate

router = APIRouter(prefix="/api/recruitment/reports", tags=["Recruitment Reports"])

PIPELINE_STAGES = ["applied", "screening", "interview", "offer", "hired", "rejected"]


@router.get("/pipeline", response_model=RecruitmentReportResponse)
def get_pipeline_report(
    request_id: int = Query(None),
    department_id: int = Query(None),
    db: Session = Depends(get_db),
):
    """Pipeline statistics and conversion rates."""
    query = db.query(Application)
    if request_id:
        query = query.filter(Application.request_id == request_id)
    if department_id:
        query = query.join(RecruitmentRequest).filter(RecruitmentRequest.department_id == department_id)

    total = query.count()

    # Count by stage
    stage_counts = (
        query.with_entities(Application.stage, func.count(Application.id))
        .group_by(Application.stage)
        .all()
    )
    stage_map = dict(stage_counts)

    pipeline = []
    for stage in PIPELINE_STAGES:
        count = stage_map.get(stage, 0)
        pipeline.append(PipelineStageCount(
            stage=stage,
            count=count,
            percentage=round(count / total * 100, 1) if total > 0 else 0,
        ))

    # Conversion rates
    conversion_rates = []
    stage_order = ["applied", "screening", "interview", "offer", "hired"]
    for i in range(len(stage_order) - 1):
        from_stage = stage_order[i]
        to_stage = stage_order[i + 1]
        from_count = sum(stage_map.get(s, 0) for s in stage_order[i:])  # All who reached this stage or beyond
        to_count = sum(stage_map.get(s, 0) for s in stage_order[i + 1:])
        rate = round(to_count / from_count * 100, 1) if from_count > 0 else 0
        conversion_rates.append(ConversionRate(from_stage=from_stage, to_stage=to_stage, rate=rate))

    # Time to hire (avg days from applied to hired)
    avg_time = None
    hired_apps = query.filter(Application.stage == "hired").all()
    if hired_apps:
        total_days = 0
        count_valid = 0
        for app in hired_apps:
            if app.applied_at and app.updated_at:
                delta = app.updated_at - app.applied_at
                total_days += delta.days
                count_valid += 1
        if count_valid > 0:
            avg_time = round(total_days / count_valid, 1)

    # Total candidates
    total_candidates = db.query(Candidate).count()

    return RecruitmentReportResponse(
        pipeline=pipeline,
        total_candidates=total_candidates,
        total_applications=total,
        conversion_rates=conversion_rates,
        avg_time_to_hire_days=avg_time,
    )
