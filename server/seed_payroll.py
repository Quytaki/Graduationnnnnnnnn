"""Seed working hours, incentive rates, and payroll summaries."""
from database import SessionLocal, engine, Base
from models import WorkingHour, IncentiveRate, PayrollSummary, Employee, Contract

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Clear existing
db.query(PayrollSummary).delete()
db.query(WorkingHour).delete()
db.query(IncentiveRate).delete()
db.commit()

employees = db.query(Employee).all()

# ── Incentive Rates ──────────────────────────────────────
incentives = [
    {"name": "Lunch Allowance",       "code": "LUNCH",     "rate_type": "fixed",      "rate_value": 500000,   "desc": "Monthly lunch allowance for all employees",       "applicable_to": "all"},
    {"name": "Transport Allowance",   "code": "TRANSPORT", "rate_type": "fixed",      "rate_value": 300000,   "desc": "Monthly transportation allowance",                "applicable_to": "all"},
    {"name": "Phone Allowance",       "code": "PHONE",     "rate_type": "fixed",      "rate_value": 200000,   "desc": "Monthly phone/communication allowance",           "applicable_to": "all"},
    {"name": "Performance Bonus",     "code": "PERF",      "rate_type": "percentage", "rate_value": 10,       "desc": "10% of base salary for high performers",         "applicable_to": "all"},
    {"name": "IT Specialist Bonus",   "code": "IT_BONUS",  "rate_type": "fixed",      "rate_value": 1500000,  "desc": "Extra allowance for IT department",               "applicable_to": "department", "dept": 1},
    {"name": "Manager Allowance",     "code": "MGR_ALLOW", "rate_type": "fixed",      "rate_value": 2000000,  "desc": "Management responsibility allowance",             "applicable_to": "position",  "pos": 2},
    {"name": "Overtime Meal",         "code": "OT_MEAL",   "rate_type": "fixed",      "rate_value": 50000,    "desc": "Meal allowance per overtime session",             "applicable_to": "all"},
    {"name": "Attendance Bonus",      "code": "ATTEND",    "rate_type": "fixed",      "rate_value": 500000,   "desc": "Perfect attendance bonus (no absent days)",       "applicable_to": "all"},
]

for inc in incentives:
    ir = IncentiveRate(
        name=inc["name"], code=inc["code"], rate_type=inc["rate_type"],
        rate_value=inc["rate_value"], description=inc["desc"],
        applicable_to=inc["applicable_to"],
        department_id=inc.get("dept"), job_position_id=inc.get("pos"),
        is_active="active",
    )
    db.add(ir)

db.commit()

# ── Working Hours (Jan & Feb 2025) ───────────────────────
import random
random.seed(42)

for emp in employees:
    for month in ["2025-01", "2025-02"]:
        std = 176
        actual = round(random.uniform(160, 184), 1)
        ot = round(random.uniform(0, 24), 1)
        late = round(random.uniform(0, 3), 1)
        absent = random.randint(0, 2)
        wd = 22 - absent

        wh = WorkingHour(
            employee_id=emp.id, period=month,
            standard_hours=std, actual_hours=actual,
            overtime_hours=ot, late_hours=late,
            absent_days=absent, working_days=wd,
        )
        db.add(wh)

db.commit()

# ── Payroll Summaries (auto-calculate for Feb 2025) ──────
period = "2025-02"
for emp in employees:
    contract = db.query(Contract).filter(
        Contract.employee_id == emp.id, Contract.status == "running"
    ).order_by(Contract.id.desc()).first()

    base = float(contract.salary) if contract and contract.salary else 0

    wh = db.query(WorkingHour).filter(
        WorkingHour.employee_id == emp.id, WorkingHour.period == period
    ).first()

    ot_hours = float(wh.overtime_hours) if wh else 0
    std_hours = float(wh.standard_hours) if wh else 176

    hourly = base / std_hours if std_hours > 0 else 0
    ot_pay = round(ot_hours * hourly * 1.5, 2)

    # Simple incentive calc: lunch + transport + phone = 1,000,000
    incentive = 1000000

    gross = round(base + ot_pay + incentive, 2)
    deductions = round(base * 0.105, 2)
    net = round(gross - deductions, 2)

    ps = PayrollSummary(
        employee_id=emp.id, period=period,
        base_salary=base, overtime_pay=ot_pay,
        incentive_total=incentive, deductions=deductions,
        gross_salary=gross, net_salary=net,
        status="confirmed" if base > 0 else "draft",
    )
    db.add(ps)

db.commit()
db.close()

count_wh = len(employees) * 2
count_ir = len(incentives)
count_ps = len(employees)
print(f"[OK] Seeded payroll data!")
print(f"   - {count_ir} incentive rates")
print(f"   - {count_wh} working hour records")
print(f"   - {count_ps} payroll summaries")
