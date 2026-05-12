from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import JobPosition, Employee
from schemas import JobPositionCreate, JobPositionUpdate, JobPositionResponse

router = APIRouter(prefix="/api/job-positions", tags=["Job Positions"])


def _job_to_response(job: JobPosition, db: Session) -> JobPositionResponse:
    count = db.query(Employee).filter(Employee.job_position_id == job.id).count()
    return JobPositionResponse(
        id=job.id,
        name=job.name,
        department_id=job.department_id,
        description=job.description,
        department_name=job.department.name if job.department else None,
        employee_count=count,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.get("", response_model=list[JobPositionResponse])
def list_job_positions(db: Session = Depends(get_db)):
    jobs = db.query(JobPosition).order_by(JobPosition.name).all()
    return [_job_to_response(j, db) for j in jobs]


@router.get("/{job_id}", response_model=JobPositionResponse)
def get_job_position(job_id: int, db: Session = Depends(get_db)):
    job = db.query(JobPosition).filter(JobPosition.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job position not found")
    return _job_to_response(job, db)


@router.post("", response_model=JobPositionResponse, status_code=201)
def create_job_position(data: JobPositionCreate, db: Session = Depends(get_db)):
    job = JobPosition(
        name=data.name,
        department_id=data.department_id,
        description=data.description,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return _job_to_response(job, db)


@router.put("/{job_id}", response_model=JobPositionResponse)
def update_job_position(job_id: int, data: JobPositionUpdate, db: Session = Depends(get_db)):
    job = db.query(JobPosition).filter(JobPosition.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job position not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(job, key, value)

    db.commit()
    db.refresh(job)
    return _job_to_response(job, db)


@router.delete("/{job_id}")
def delete_job_position(job_id: int, db: Session = Depends(get_db)):
    job = db.query(JobPosition).filter(JobPosition.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job position not found")
    db.delete(job)
    db.commit()
    return {"message": "Job position deleted successfully"}
