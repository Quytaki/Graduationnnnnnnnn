"""Audit all employee data"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from database import SessionLocal
from models import Employee, Contract, WorkingHour, PayrollSummary, Attendance
from sqlalchemy import func

db = SessionLocal()

emps = db.query(Employee).filter(Employee.status == 'active').all()
print(f'=== ACTIVE EMPLOYEES: {len(emps)} ===')
for e in emps:
    dept = e.department.name if e.department else 'N/A'
    pos = e.job_position.name if e.job_position else 'N/A'
    ct = db.query(Contract).filter(Contract.employee_id == e.id, Contract.status == 'running').first()
    salary = float(ct.salary) if ct and ct.salary else 0
    wh = db.query(func.count(WorkingHour.id)).filter(WorkingHour.employee_id == e.id).scalar()
    ps = db.query(func.count(PayrollSummary.id)).filter(PayrollSummary.employee_id == e.id).scalar()
    att = db.query(func.count(Attendance.id)).filter(Attendance.employee_id == e.id).scalar()
    role = e.role or 'staff'
    is_mgr = role in ('director', 'department_head', 'team_lead')
    flags = []
    if not ct:
        flags.append('NO_CONTRACT')
    elif is_mgr and salary < 10000000:
        flags.append(f'MGR_LOW({salary:,.0f})')
    elif not is_mgr and salary < 8000000:
        flags.append(f'STAFF_LOW({salary:,.0f})')
    if ps == 0:
        flags.append('NO_PAYROLL')
    if wh == 0:
        flags.append('NO_WH')
    flag_str = ' | '.join(flags) if flags else 'OK'
    print(f'  [{e.id:2d}] {e.name:25s} {role:15s} {salary:>12,.0f}  CT={"Y" if ct else "N"} WH={wh} PS={ps} ATT={att:3d}  [{flag_str}]')

db.close()
