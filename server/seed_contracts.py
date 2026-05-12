"""Seed sample contracts and terminations."""
from database import SessionLocal, engine, Base
from models import Contract, Termination, Employee

Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Get employee IDs
employees = db.query(Employee).all()
emp_map = {e.name: e for e in employees}

# Clear existing
db.query(Contract).delete()
db.query(Termination).delete()
db.commit()

# ── Contracts ────────────────────────────────────────────
contracts_data = [
    {"employee": "John Smith",       "ref": "CTR-2023-001", "type": "permanent",  "start": "2023-03-15", "end": None,          "salary": 95000, "status": "running"},
    {"employee": "Sarah Johnson",    "ref": "CTR-2022-001", "type": "permanent",  "start": "2022-08-01", "end": None,          "salary": 85000, "status": "running"},
    {"employee": "Michael Chen",     "ref": "CTR-2024-001", "type": "fixed-term", "start": "2024-01-10", "end": "2025-01-10",  "salary": 72000, "status": "running"},
    {"employee": "Emily Davis",      "ref": "CTR-2023-002", "type": "permanent",  "start": "2023-06-20", "end": None,          "salary": 78000, "status": "running"},
    {"employee": "Robert Wilson",    "ref": "CTR-2024-002", "type": "fixed-term", "start": "2024-04-01", "end": "2025-04-01",  "salary": 65000, "status": "running"},
    {"employee": "Amanda Martinez",  "ref": "CTR-2023-003", "type": "permanent",  "start": "2023-09-12", "end": None,          "salary": 70000, "status": "running"},
    {"employee": "David Brown",      "ref": "CTR-2023-004", "type": "permanent",  "start": "2023-11-05", "end": None,          "salary": 88000, "status": "running"},
    {"employee": "Lisa Anderson",    "ref": "CTR-2024-003", "type": "internship", "start": "2024-02-18", "end": "2024-08-18",  "salary": 35000, "status": "expired"},
    {"employee": "James Taylor",     "ref": "CTR-2022-002", "type": "permanent",  "start": "2022-12-01", "end": None,          "salary": 82000, "status": "running"},
    {"employee": "Thomas Lee",       "ref": "CTR-2023-005", "type": "permanent",  "start": "2023-07-22", "end": None,          "salary": 75000, "status": "running"},
    {"employee": "Daniel Nguyen",    "ref": "CTR-2024-004", "type": "freelance",  "start": "2024-07-15", "end": "2025-07-15",  "salary": 80000, "status": "running"},
    {"employee": "Kevin Park",       "ref": "CTR-2022-003", "type": "fixed-term", "start": "2022-06-14", "end": "2024-06-14",  "salary": 60000, "status": "expired"},
]

for cd in contracts_data:
    emp = emp_map.get(cd["employee"])
    if not emp:
        continue
    c = Contract(
        employee_id=emp.id, reference=cd["ref"], contract_type=cd["type"],
        start_date=cd["start"], end_date=cd["end"], salary=cd["salary"],
        wage_type="monthly", department_id=emp.department_id,
        job_position_id=emp.job_position_id, status=cd["status"],
    )
    db.add(c)

# ── Terminations ─────────────────────────────────────────
terminations_data = [
    {"employee": "Kevin Park",    "date": "2024-06-14", "reason": "end_of_contract", "notice": "2024-05-14", "last_day": "2024-06-14", "status": "completed",
     "desc": "Fixed-term contract ended. Employee chose not to renew."},
    {"employee": "Lisa Anderson", "date": "2024-08-18", "reason": "end_of_contract", "notice": "2024-07-18", "last_day": "2024-08-18", "status": "completed",
     "desc": "Internship period completed successfully."},
]

for td in terminations_data:
    emp = emp_map.get(td["employee"])
    if not emp:
        continue
    t = Termination(
        employee_id=emp.id, termination_date=td["date"], reason=td["reason"],
        description=td["desc"], notice_date=td["notice"],
        last_working_day=td["last_day"], status=td["status"],
    )
    db.add(t)

db.commit()
db.close()

print("[OK] Seeded contracts and terminations!")
print(f"   - {len(contracts_data)} contracts")
print(f"   - {len(terminations_data)} terminations")
