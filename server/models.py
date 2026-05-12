from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Numeric, Boolean, func, Float
from sqlalchemy.orm import relationship
from database import Base


# ── Auth Module ───────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(20), nullable=False, default="hr")       # admin | hr | employee
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    company = Column(String(100), nullable=False, default="TechCorp")
    description = Column(Text, nullable=True)
    color = Column(String(20), default="#714B67")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    employees = relationship("Employee", back_populates="department")
    job_positions = relationship("JobPosition", back_populates="department")


class JobPosition(Base):
    __tablename__ = "job_positions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    department = relationship("Department", back_populates="job_positions")
    employees = relationship("Employee", back_populates="job_position")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=True)
    phone = Column(String(30), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    job_position_id = Column(Integer, ForeignKey("job_positions.id", ondelete="SET NULL"), nullable=True)
    company = Column(String(100), nullable=False, default="TechCorp")
    work_address = Column(Text, nullable=True)
    work_email = Column(String(150), nullable=True)
    work_phone = Column(String(30), nullable=True)
    hire_date = Column(String(20), nullable=True)
    status = Column(String(20), nullable=False, default="active")  # active | archived
    avatar_color = Column(String(20), default="#714B67")
    # ── Org hierarchy ─────────────────────────────────────
    role = Column(String(30), nullable=False, default="staff")  # director | department_head | team_lead | senior | staff
    manager_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    department = relationship("Department", back_populates="employees")
    job_position = relationship("JobPosition", back_populates="employees")
    manager = relationship("Employee", remote_side="Employee.id", foreign_keys=[manager_id], backref="subordinates")
    contracts = relationship("Contract", back_populates="employee", cascade="all, delete-orphan")
    terminations = relationship("Termination", back_populates="employee", cascade="all, delete-orphan")
    attendances = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    overtimes = relationship("Overtime", back_populates="employee", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")
    leave_balances = relationship("LeaveBalance", back_populates="employee", cascade="all, delete-orphan")


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    reference = Column(String(50), nullable=True)                     # e.g. "CTR-2024-001"
    contract_type = Column(String(50), nullable=False, default="permanent")  # permanent | fixed-term | internship | freelance
    start_date = Column(String(20), nullable=False)
    end_date = Column(String(20), nullable=True)                      # null = indefinite
    salary = Column(Numeric(12, 2), nullable=True)
    wage_type = Column(String(20), default="monthly")                 # monthly | hourly
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    job_position_id = Column(Integer, ForeignKey("job_positions.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), nullable=False, default="draft")      # draft | running | expired | cancelled
    notes = Column(Text, nullable=True)
    # ── Approval tracking ─────────────────────────────────
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    employee = relationship("Employee", back_populates="contracts")
    department = relationship("Department")
    job_position = relationship("JobPosition")
    approver = relationship("User", foreign_keys=[approved_by])


class Termination(Base):
    __tablename__ = "terminations"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    termination_date = Column(String(20), nullable=False)
    reason = Column(String(50), nullable=False, default="resignation")  # resignation | dismissal | layoff | end_of_contract | retirement | mutual_agreement
    description = Column(Text, nullable=True)
    notice_date = Column(String(20), nullable=True)
    last_working_day = Column(String(20), nullable=True)
    status = Column(String(20), nullable=False, default="pending")    # pending | approved | completed | cancelled
    # ── Approval tracking ─────────────────────────────────
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    employee = relationship("Employee", back_populates="terminations")
    approver = relationship("User", foreign_keys=[approved_by])


# ── Payroll Module ────────────────────────────────────────

class WorkingHour(Base):
    __tablename__ = "working_hours"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    period = Column(String(7), nullable=False)           # "2024-01" (YYYY-MM)
    standard_hours = Column(Numeric(8, 2), default=176)  # standard monthly hours (22 days × 8h)
    actual_hours = Column(Numeric(8, 2), default=0)
    overtime_hours = Column(Numeric(8, 2), default=0)
    late_hours = Column(Numeric(8, 2), default=0)
    absent_days = Column(Numeric(5, 1), default=0)
    working_days = Column(Numeric(5, 1), default=22)     # actual working days
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    employee = relationship("Employee")


class IncentiveRate(Base):
    __tablename__ = "incentive_rates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)            # e.g. "Phụ cấp ăn trưa"
    code = Column(String(30), nullable=True, unique=True) # e.g. "LUNCH_ALLOW"
    rate_type = Column(String(20), nullable=False, default="fixed")  # fixed | percentage | per_hour
    rate_value = Column(Numeric(12, 2), nullable=False)   # amount or percentage
    description = Column(Text, nullable=True)
    applicable_to = Column(String(20), default="all")     # all | department | position
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    job_position_id = Column(Integer, ForeignKey("job_positions.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(String(10), default="active")      # active | inactive
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    department = relationship("Department")
    job_position = relationship("JobPosition")


class PayrollSummary(Base):
    __tablename__ = "payroll_summaries"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    period = Column(String(7), nullable=False)            # "2024-01"
    base_salary = Column(Numeric(12, 2), default=0)       # lương cơ bản
    overtime_pay = Column(Numeric(12, 2), default=0)      # lương tăng ca
    incentive_total = Column(Numeric(12, 2), default=0)   # tổng phụ cấp / thưởng
    deductions = Column(Numeric(12, 2), default=0)        # khấu trừ (BHXH, thuế, v.v.)
    gross_salary = Column(Numeric(12, 2), default=0)      # tổng lương trước thuế
    net_salary = Column(Numeric(12, 2), default=0)        # thực lĩnh
    status = Column(String(20), default="draft")          # draft | confirmed | paid
    notes = Column(Text, nullable=True)
    # ── Confirmation tracking ─────────────────────────────
    confirmed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    employee = relationship("Employee")
    confirmer = relationship("User", foreign_keys=[confirmed_by])


# ── Company Location ──────────────────────────────────────

class CompanyLocation(Base):
    __tablename__ = "company_locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)              # "Trụ sở chính"
    address = Column(Text, nullable=True)                   # Địa chỉ dạng text
    latitude = Column(Float, nullable=False)                # Vĩ độ
    longitude = Column(Float, nullable=False)               # Kinh độ
    radius_meters = Column(Integer, default=200)            # Bán kính cho phép (mét)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ── Attendance Module ─────────────────────────────────────

class Attendance(Base):
    __tablename__ = "attendances"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    date = Column(String(10), nullable=False)              # "2025-02-15" (YYYY-MM-DD)
    check_in = Column(DateTime, nullable=True)
    check_out = Column(DateTime, nullable=True)
    check_in_status = Column(String(10), nullable=True)    # ontime | late | null
    worked_hours = Column(Numeric(5, 2), default=0)        # auto-calc from check-in/out
    overtime_hours = Column(Numeric(5, 2), default=0)      # hours beyond 8h
    status = Column(String(15), default="absent")          # present | absent | half_day | on_leave
    notes = Column(Text, nullable=True)
    # GPS check-in/out data
    check_in_lat = Column(Float, nullable=True)
    check_in_lng = Column(Float, nullable=True)
    check_out_lat = Column(Float, nullable=True)
    check_out_lng = Column(Float, nullable=True)
    check_in_location_id = Column(Integer, ForeignKey("company_locations.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee", back_populates="attendances")
    check_in_location = relationship("CompanyLocation")


class Overtime(Base):
    __tablename__ = "overtimes"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    date = Column(String(10), nullable=False)
    start_time = Column(String(5), nullable=True)          # "18:00"
    end_time = Column(String(5), nullable=True)            # "21:00"
    hours = Column(Numeric(5, 2), nullable=False, default=0)
    reason = Column(Text, nullable=True)
    status = Column(String(15), default="pending")         # pending | approved | rejected
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee", back_populates="overtimes")
    approver = relationship("User")


# ── Leave Module ──────────────────────────────────────────

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    leave_type = Column(String(20), nullable=False, default="annual")  # annual | unpaid | sick | maternity | other
    start_date = Column(String(10), nullable=False)
    end_date = Column(String(10), nullable=False)
    total_days = Column(Numeric(5, 1), nullable=False, default=1)
    reason = Column(Text, nullable=True)
    status = Column(String(15), default="pending")  # draft | pending | approved | rejected | cancelled
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee", back_populates="leave_requests")
    approver = relationship("User")


class PublicHoliday(Base):
    __tablename__ = "public_holidays"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    date = Column(String(10), nullable=False)
    year = Column(Integer, nullable=False)
    is_recurring = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    year = Column(Integer, nullable=False)
    annual_total = Column(Numeric(5, 1), default=12)
    annual_used = Column(Numeric(5, 1), default=0)
    annual_remaining = Column(Numeric(5, 1), default=12)
    sick_total = Column(Numeric(5, 1), default=30)
    sick_used = Column(Numeric(5, 1), default=0)
    unpaid_used = Column(Numeric(5, 1), default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee", back_populates="leave_balances")


# ── Recruitment Module ────────────────────────────────────

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=True)
    phone = Column(String(30), nullable=True)
    source = Column(String(30), default="other")          # referral | website | linkedin | other
    cv_file = Column(String(500), nullable=True)           # file path
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    applications = relationship("Application", back_populates="candidate", cascade="all, delete-orphan")
    email_logs = relationship("EmailLog", back_populates="candidate", cascade="all, delete-orphan")


class RecruitmentRequest(Base):
    __tablename__ = "recruitment_requests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    job_position_id = Column(Integer, ForeignKey("job_positions.id", ondelete="SET NULL"), nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    description = Column(Text, nullable=True)
    requirements = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="pending")  # pending | approved | closed
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    department = relationship("Department")
    job_position = relationship("JobPosition")
    creator = relationship("User", foreign_keys=[created_by])
    applications = relationship("Application", back_populates="request", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    request_id = Column(Integer, ForeignKey("recruitment_requests.id", ondelete="CASCADE"), nullable=False)
    stage = Column(String(20), nullable=False, default="applied")   # applied | screening | interview | offer | hired | rejected
    ai_score = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    applied_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    candidate = relationship("Candidate", back_populates="applications")
    request = relationship("RecruitmentRequest", back_populates="applications")
    interviews = relationship("Interview", back_populates="application", cascade="all, delete-orphan")
    offers = relationship("Offer", back_populates="application", cascade="all, delete-orphan")
    screening_results = relationship("AIScreeningResult", back_populates="application", cascade="all, delete-orphan")


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    interviewer_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=60)
    interview_type = Column(String(20), default="offline")           # online | offline
    location = Column(String(300), nullable=True)
    notes = Column(Text, nullable=True)
    result = Column(String(20), default="pending")                   # pending | passed | failed
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    application = relationship("Application", back_populates="interviews")
    interviewer = relationship("Employee")


class Offer(Base):
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    salary = Column(Numeric(12, 2), nullable=True)
    start_date = Column(String(20), nullable=True)
    status = Column(String(20), nullable=False, default="pending")   # pending | accepted | rejected
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    application = relationship("Application", back_populates="offers")


class AIScreeningResult(Base):
    __tablename__ = "ai_screening_results"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=True)                            # 0-100
    criteria_breakdown = Column(Text, nullable=True)                # JSON string
    must_have_check = Column(Text, nullable=True)                   # JSON string
    summary = Column(Text, nullable=True)
    recommendation = Column(String(20), nullable=True)              # strong_fit | potential | not_fit
    screening_template_id = Column(Integer, ForeignKey("screening_templates.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    application = relationship("Application", back_populates="screening_results")
    template = relationship("ScreeningTemplate")


class ScreeningTemplate(Base):
    __tablename__ = "screening_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    job_position_id = Column(Integer, ForeignKey("job_positions.id", ondelete="SET NULL"), nullable=True)
    criteria = Column(Text, nullable=True)                          # JSON string: [{name, weight, must_have, description}]
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    job_position = relationship("JobPosition")


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="SET NULL"), nullable=True)
    email_type = Column(String(30), default="other")                # interview_invite | result_notification | other
    subject = Column(String(300), nullable=True)
    content = Column(Text, nullable=True)
    status = Column(String(20), default="sent")                     # sent | failed
    sent_at = Column(DateTime, server_default=func.now())

    # Relationships
    candidate = relationship("Candidate", back_populates="email_logs")
    application = relationship("Application")

