from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Auth / User ───────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "hr"  # admin | hr | employee


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    is_active: bool
    employee_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ── Department ────────────────────────────────────────────

class DepartmentBase(BaseModel):
    name: str
    company: str = "TechCorp"
    description: Optional[str] = None
    color: Optional[str] = "#714B67"


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class DepartmentResponse(DepartmentBase):
    id: int
    employee_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Job Position ──────────────────────────────────────────

class JobPositionBase(BaseModel):
    name: str
    department_id: Optional[int] = None
    description: Optional[str] = None


class JobPositionCreate(JobPositionBase):
    pass


class JobPositionUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[int] = None
    description: Optional[str] = None


class JobPositionResponse(JobPositionBase):
    id: int
    department_name: Optional[str] = None
    employee_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Employee ──────────────────────────────────────────────

class EmployeeBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    company: str = "TechCorp"
    work_address: Optional[str] = None
    work_email: Optional[str] = None
    work_phone: Optional[str] = None
    hire_date: Optional[str] = None
    status: str = "active"
    avatar_color: Optional[str] = None
    role: str = "staff"
    manager_id: Optional[int] = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    company: Optional[str] = None
    work_address: Optional[str] = None
    work_email: Optional[str] = None
    work_phone: Optional[str] = None
    hire_date: Optional[str] = None
    status: Optional[str] = None
    avatar_color: Optional[str] = None
    role: Optional[str] = None
    manager_id: Optional[int] = None


class EmployeeResponse(EmployeeBase):
    id: int
    department_name: Optional[str] = None
    job_position_name: Optional[str] = None
    manager_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Org Chart ─────────────────────────────────────────────

class OrgChartNode(BaseModel):
    id: int
    name: str
    role: str
    job_position_name: Optional[str] = None
    department_name: Optional[str] = None
    avatar_color: Optional[str] = None
    manager_id: Optional[int] = None
    subordinate_count: int = 0
    children: list["OrgChartNode"] = []


# ── Pagination ────────────────────────────────────────────

class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int


class EmployeeListResponse(BaseModel):
    data: list[EmployeeResponse]
    pagination: PaginationMeta


# ── Contract ──────────────────────────────────────────────

class ContractBase(BaseModel):
    employee_id: int
    reference: Optional[str] = None
    contract_type: str = "permanent"  # permanent | fixed-term | internship | freelance
    start_date: str
    end_date: Optional[str] = None
    salary: Optional[float] = None
    wage_type: str = "monthly"
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    status: str = "draft"  # draft | running | expired | cancelled
    notes: Optional[str] = None


class ContractCreate(ContractBase):
    pass


class ContractUpdate(BaseModel):
    employee_id: Optional[int] = None
    reference: Optional[str] = None
    contract_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    salary: Optional[float] = None
    wage_type: Optional[str] = None
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ContractResponse(ContractBase):
    id: int
    employee_name: Optional[str] = None
    department_name: Optional[str] = None
    job_position_name: Optional[str] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    approver_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ContractListResponse(BaseModel):
    data: list[ContractResponse]
    pagination: PaginationMeta


# ── Termination ───────────────────────────────────────────

class TerminationBase(BaseModel):
    employee_id: int
    termination_date: str
    reason: str = "resignation"  # resignation | dismissal | layoff | end_of_contract | retirement | mutual_agreement
    description: Optional[str] = None
    notice_date: Optional[str] = None
    last_working_day: Optional[str] = None
    status: str = "pending"  # pending | approved | completed | cancelled


class TerminationCreate(TerminationBase):
    pass


class TerminationUpdate(BaseModel):
    employee_id: Optional[int] = None
    termination_date: Optional[str] = None
    reason: Optional[str] = None
    description: Optional[str] = None
    notice_date: Optional[str] = None
    last_working_day: Optional[str] = None
    status: Optional[str] = None


class TerminationResponse(TerminationBase):
    id: int
    employee_name: Optional[str] = None
    approved_by: Optional[int] = None
    approver_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TerminationListResponse(BaseModel):
    data: list[TerminationResponse]
    pagination: PaginationMeta


# ── Working Hour ──────────────────────────────────────────

class WorkingHourBase(BaseModel):
    employee_id: int
    period: str                              # "2024-01"
    standard_hours: float = 176
    actual_hours: float = 0
    overtime_hours: float = 0
    late_hours: float = 0
    absent_days: float = 0
    working_days: float = 22
    notes: Optional[str] = None


class WorkingHourCreate(WorkingHourBase):
    pass


class WorkingHourUpdate(BaseModel):
    employee_id: Optional[int] = None
    period: Optional[str] = None
    standard_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    overtime_hours: Optional[float] = None
    late_hours: Optional[float] = None
    absent_days: Optional[float] = None
    working_days: Optional[float] = None
    notes: Optional[str] = None


class WorkingHourResponse(WorkingHourBase):
    id: int
    employee_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkingHourListResponse(BaseModel):
    data: list[WorkingHourResponse]
    pagination: PaginationMeta


# ── Incentive Rate ────────────────────────────────────────

class IncentiveRateBase(BaseModel):
    name: str
    code: Optional[str] = None
    rate_type: str = "fixed"                 # fixed | percentage | per_hour
    rate_value: float
    description: Optional[str] = None
    applicable_to: str = "all"               # all | department | position
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    is_active: str = "active"


class IncentiveRateCreate(IncentiveRateBase):
    pass


class IncentiveRateUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    rate_type: Optional[str] = None
    rate_value: Optional[float] = None
    description: Optional[str] = None
    applicable_to: Optional[str] = None
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    is_active: Optional[str] = None


class IncentiveRateResponse(IncentiveRateBase):
    id: int
    department_name: Optional[str] = None
    job_position_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class IncentiveRateListResponse(BaseModel):
    data: list[IncentiveRateResponse]
    pagination: PaginationMeta


# ── Payroll Summary ───────────────────────────────────────

class PayrollSummaryBase(BaseModel):
    employee_id: int
    period: str
    base_salary: float = 0
    overtime_pay: float = 0
    incentive_total: float = 0
    deductions: float = 0
    gross_salary: float = 0
    net_salary: float = 0
    status: str = "draft"                    # draft | confirmed | paid
    notes: Optional[str] = None


class PayrollSummaryCreate(PayrollSummaryBase):
    pass


class PayrollSummaryUpdate(BaseModel):
    employee_id: Optional[int] = None
    period: Optional[str] = None
    base_salary: Optional[float] = None
    overtime_pay: Optional[float] = None
    incentive_total: Optional[float] = None
    deductions: Optional[float] = None
    gross_salary: Optional[float] = None
    net_salary: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class PayrollSummaryResponse(PayrollSummaryBase):
    id: int
    employee_name: Optional[str] = None
    department_name: Optional[str] = None
    job_position_name: Optional[str] = None
    confirmed_by: Optional[int] = None
    confirmed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    confirmer_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PayrollSummaryListResponse(BaseModel):
    data: list[PayrollSummaryResponse]
    pagination: PaginationMeta


# ── Company Location ─────────────────────────────────────

class CompanyLocationCreate(BaseModel):
    name: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    radius_meters: int = 200
    is_active: bool = True


class CompanyLocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_meters: Optional[int] = None
    is_active: Optional[bool] = None


class CompanyLocationResponse(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    radius_meters: int
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── GPS Check-in/Check-out ───────────────────────────────

class GPSCheckInRequest(BaseModel):
    latitude: float
    longitude: float


class GPSCheckOutRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class AttendanceStatusResponse(BaseModel):
    date: str
    checked_in: bool
    checked_out: bool
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    check_in_status: Optional[str] = None
    worked_hours: float = 0
    overtime_hours: float = 0
    status: Optional[str] = None
    location_name: Optional[str] = None


# ── Attendance ────────────────────────────────────────────

class AttendanceBase(BaseModel):
    employee_id: int
    date: str
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    check_in_status: Optional[str] = None
    worked_hours: float = 0
    overtime_hours: float = 0
    status: str = "absent"
    notes: Optional[str] = None


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceUpdate(BaseModel):
    employee_id: Optional[int] = None
    date: Optional[str] = None
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    check_in_status: Optional[str] = None
    worked_hours: Optional[float] = None
    overtime_hours: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class AttendanceResponse(AttendanceBase):
    id: int
    employee_name: Optional[str] = None
    department_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AttendanceListResponse(BaseModel):
    data: list[AttendanceResponse]
    pagination: PaginationMeta


class AttendanceImportRow(BaseModel):
    employee_id: int
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    status: str = "present"
    notes: Optional[str] = None


class AttendanceGenerateRequest(BaseModel):
    start_date: str
    end_date: str
    default_status: str = "present"
    default_check_in: Optional[str] = "08:00"
    default_check_out: Optional[str] = "17:00"


# ── Overtime ──────────────────────────────────────────────

class OvertimeBase(BaseModel):
    employee_id: int
    date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    hours: float = 0
    reason: Optional[str] = None
    status: str = "pending"
    notes: Optional[str] = None


class OvertimeCreate(OvertimeBase):
    pass


class OvertimeUpdate(BaseModel):
    employee_id: Optional[int] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    hours: Optional[float] = None
    reason: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class OvertimeResponse(OvertimeBase):
    id: int
    employee_name: Optional[str] = None
    department_name: Optional[str] = None
    approver_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OvertimeListResponse(BaseModel):
    data: list[OvertimeResponse]
    pagination: PaginationMeta


class OvertimeSummaryItem(BaseModel):
    employee_id: int
    employee_name: str
    department_name: Optional[str] = None
    period: str
    total_hours: float
    approved_hours: float
    pending_hours: float
    rejected_hours: float
    entry_count: int


class OvertimeSummaryResponse(BaseModel):
    data: list[OvertimeSummaryItem]
    pagination: PaginationMeta


# ── Leave Request ─────────────────────────────────────────

class LeaveRequestBase(BaseModel):
    employee_id: int
    leave_type: str = "annual"
    start_date: str
    end_date: str
    total_days: float = 1
    reason: Optional[str] = None
    status: str = "pending"
    notes: Optional[str] = None


class LeaveRequestCreate(LeaveRequestBase):
    pass


class LeaveRequestUpdate(BaseModel):
    employee_id: Optional[int] = None
    leave_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    total_days: Optional[float] = None
    reason: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class LeaveRequestResponse(LeaveRequestBase):
    id: int
    employee_name: Optional[str] = None
    department_name: Optional[str] = None
    approver_name: Optional[str] = None
    approved_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LeaveRequestListResponse(BaseModel):
    data: list[LeaveRequestResponse]
    pagination: PaginationMeta


# ── Public Holiday ────────────────────────────────────────

class PublicHolidayBase(BaseModel):
    name: str
    date: str
    year: int
    is_recurring: bool = False
    description: Optional[str] = None


class PublicHolidayCreate(PublicHolidayBase):
    pass


class PublicHolidayUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[str] = None
    year: Optional[int] = None
    is_recurring: Optional[bool] = None
    description: Optional[str] = None


class PublicHolidayResponse(PublicHolidayBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PublicHolidayListResponse(BaseModel):
    data: list[PublicHolidayResponse]
    pagination: PaginationMeta


# ── Leave Balance ─────────────────────────────────────────

class LeaveBalanceBase(BaseModel):
    employee_id: int
    year: int
    annual_total: float = 12
    annual_used: float = 0
    annual_remaining: float = 12
    sick_total: float = 30
    sick_used: float = 0
    unpaid_used: float = 0


class LeaveBalanceCreate(LeaveBalanceBase):
    pass


class LeaveBalanceUpdate(BaseModel):
    employee_id: Optional[int] = None
    year: Optional[int] = None
    annual_total: Optional[float] = None
    annual_used: Optional[float] = None
    annual_remaining: Optional[float] = None
    sick_total: Optional[float] = None
    sick_used: Optional[float] = None
    unpaid_used: Optional[float] = None


class LeaveBalanceResponse(LeaveBalanceBase):
    id: int
    employee_name: Optional[str] = None
    department_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LeaveBalanceListResponse(BaseModel):
    data: list[LeaveBalanceResponse]
    pagination: PaginationMeta


# ── Leave Summary / Absenteeism ───────────────────────────

class LeaveSummaryItem(BaseModel):
    employee_id: int
    employee_name: str
    department_name: Optional[str] = None
    annual_total: float
    annual_used: float
    annual_remaining: float
    sick_used: float
    unpaid_used: float
    total_leave_days: float


class LeaveSummaryResponse(BaseModel):
    data: list[LeaveSummaryItem]
    pagination: PaginationMeta


class AbsenteeismItem(BaseModel):
    employee_id: int
    employee_name: str
    department_name: Optional[str] = None
    total_working_days: float
    absent_days: float
    leave_days: float
    absenteeism_rate: float  # percentage


class AbsenteeismResponse(BaseModel):
    data: list[AbsenteeismItem]
    pagination: PaginationMeta


# ── Recruitment Module ────────────────────────────────────

# -- Candidate --
class CandidateBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    source: str = "other"          # referral | website | linkedin | other
    cv_file: Optional[str] = None
    notes: Optional[str] = None


class CandidateCreate(CandidateBase):
    pass


class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    cv_file: Optional[str] = None
    notes: Optional[str] = None


class CandidateResponse(CandidateBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    application_count: int = 0

    class Config:
        from_attributes = True


class CandidateListResponse(BaseModel):
    data: list[CandidateResponse]
    pagination: PaginationMeta


# -- Recruitment Request --
class RecruitmentRequestBase(BaseModel):
    title: str
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    quantity: int = 1
    description: Optional[str] = None
    requirements: Optional[str] = None
    status: str = "pending"


class RecruitmentRequestCreate(RecruitmentRequestBase):
    pass


class RecruitmentRequestUpdate(BaseModel):
    title: Optional[str] = None
    department_id: Optional[int] = None
    job_position_id: Optional[int] = None
    quantity: Optional[int] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    status: Optional[str] = None


class RecruitmentRequestResponse(RecruitmentRequestBase):
    id: int
    department_name: Optional[str] = None
    job_position_name: Optional[str] = None
    creator_name: Optional[str] = None
    application_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RecruitmentRequestListResponse(BaseModel):
    data: list[RecruitmentRequestResponse]
    pagination: PaginationMeta


# -- Application --
class ApplicationBase(BaseModel):
    candidate_id: int
    request_id: int
    stage: str = "applied"
    ai_score: Optional[float] = None
    notes: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    candidate_id: Optional[int] = None
    request_id: Optional[int] = None
    stage: Optional[str] = None
    ai_score: Optional[float] = None
    notes: Optional[str] = None


class ApplicationResponse(ApplicationBase):
    id: int
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    candidate_phone: Optional[str] = None
    candidate_cv: Optional[str] = None
    request_title: Optional[str] = None
    position_name: Optional[str] = None
    department_name: Optional[str] = None
    applied_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApplicationListResponse(BaseModel):
    data: list[ApplicationResponse]
    pagination: PaginationMeta


# -- Interview --
class InterviewBase(BaseModel):
    application_id: int
    interviewer_id: Optional[int] = None
    scheduled_at: str                        # ISO datetime string
    duration_minutes: int = 60
    interview_type: str = "offline"          # online | offline
    location: Optional[str] = None
    notes: Optional[str] = None
    result: str = "pending"


class InterviewCreate(InterviewBase):
    pass


class InterviewUpdate(BaseModel):
    application_id: Optional[int] = None
    interviewer_id: Optional[int] = None
    scheduled_at: Optional[str] = None
    duration_minutes: Optional[int] = None
    interview_type: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    result: Optional[str] = None


class InterviewResponse(InterviewBase):
    id: int
    candidate_name: Optional[str] = None
    interviewer_name: Optional[str] = None
    position_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InterviewListResponse(BaseModel):
    data: list[InterviewResponse]
    pagination: PaginationMeta


# -- Offer --
class OfferBase(BaseModel):
    application_id: int
    salary: Optional[float] = None
    start_date: Optional[str] = None
    status: str = "pending"
    notes: Optional[str] = None


class OfferCreate(OfferBase):
    pass


class OfferUpdate(BaseModel):
    application_id: Optional[int] = None
    salary: Optional[float] = None
    start_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class OfferResponse(OfferBase):
    id: int
    candidate_name: Optional[str] = None
    position_name: Optional[str] = None
    department_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OfferListResponse(BaseModel):
    data: list[OfferResponse]
    pagination: PaginationMeta


# -- AI Screening --
class AIScreeningRequest(BaseModel):
    application_id: int
    template_id: Optional[int] = None
    custom_criteria: Optional[list] = None   # [{name, weight, must_have, description}]


class AIScreeningResultResponse(BaseModel):
    id: int
    application_id: int
    score: Optional[float] = None
    criteria_breakdown: Optional[str] = None  # JSON string
    must_have_check: Optional[str] = None     # JSON string
    summary: Optional[str] = None
    recommendation: Optional[str] = None
    screening_template_id: Optional[int] = None
    template_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# -- Screening Template --
class ScreeningTemplateBase(BaseModel):
    name: str
    job_position_id: Optional[int] = None
    criteria: Optional[str] = None           # JSON string


class ScreeningTemplateCreate(ScreeningTemplateBase):
    pass


class ScreeningTemplateUpdate(BaseModel):
    name: Optional[str] = None
    job_position_id: Optional[int] = None
    criteria: Optional[str] = None


class ScreeningTemplateResponse(ScreeningTemplateBase):
    id: int
    job_position_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# -- Email Log --
class EmailSendRequest(BaseModel):
    candidate_id: int
    application_id: Optional[int] = None
    email_type: str = "other"                # interview_invite | result_notification | other
    subject: str
    content: str


class EmailLogResponse(BaseModel):
    id: int
    candidate_id: int
    candidate_name: Optional[str] = None
    application_id: Optional[int] = None
    email_type: str
    subject: Optional[str] = None
    content: Optional[str] = None
    status: str
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EmailLogListResponse(BaseModel):
    data: list[EmailLogResponse]
    pagination: PaginationMeta


# -- Recruitment Reports --
class PipelineStageCount(BaseModel):
    stage: str
    count: int
    percentage: float = 0


class ConversionRate(BaseModel):
    from_stage: str
    to_stage: str
    rate: float


class RecruitmentReportResponse(BaseModel):
    pipeline: list[PipelineStageCount]
    total_candidates: int = 0
    total_applications: int = 0
    conversion_rates: list[ConversionRate] = []
    avg_time_to_hire_days: Optional[float] = None
