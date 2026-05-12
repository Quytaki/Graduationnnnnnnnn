"""
Master fix script:
1. Fix all contracts: min 8M staff, min 10M manager
2. Create contracts for employees without one
3. Generate attendance for all employees (ensure >= 1 month)
4. Sync working hours
5. Calculate payroll (ensure >= 1 month paid)
6. Sync overtime records
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import random
from datetime import datetime, timedelta
from decimal import Decimal
from database import SessionLocal
from models import (
    Employee, Contract, Attendance, Overtime, WorkingHour,
    PayrollSummary, IncentiveRate, Department, JobPosition
)
from sqlalchemy import func as sa_func

db = SessionLocal()

PERIOD = "2026-04"  # Target month
YEAR = 2026
MONTH = 4
START_DATE = datetime(YEAR, MONTH, 1).date()
END_DATE = datetime(YEAR, MONTH, 30).date()

# Salary ranges by role (VND)
SALARY_MAP = {
    'director':        random.randint(18, 25) * 1000000,
    'department_head': random.randint(12, 18) * 1000000,
    'team_lead':       random.randint(10, 14) * 1000000,
    'senior':          random.randint(9, 12) * 1000000,
    'staff':           random.randint(8, 10) * 1000000,
}

MGR_ROLES = ('director', 'department_head', 'team_lead')

try:
    emps = db.query(Employee).filter(Employee.status == 'active').all()
    print(f"Processing {len(emps)} active employees...\n")

    # Pre-load incentive rates
    incentives = db.query(IncentiveRate).filter(IncentiveRate.is_active == "active").all()

    # Get first dept/pos as fallback
    fallback_dept = db.query(Department).first()
    fallback_pos = db.query(JobPosition).first()

    for emp in emps:
        role = emp.role or 'staff'
        is_mgr = role in MGR_ROLES
        min_salary = 10000000 if is_mgr else 8000000
        print(f"--- [{emp.id:2d}] {emp.name} (role={role}) ---")

        # ═══════════════════════════════════════════════════
        # STEP 1: Fix or create contract
        # ═══════════════════════════════════════════════════
        contract = db.query(Contract).filter(
            Contract.employee_id == emp.id,
            Contract.status == 'running'
        ).first()

        if contract:
            salary = float(contract.salary or 0)
            if salary < min_salary:
                new_salary = SALARY_MAP.get(role, 8000000)
                if new_salary < min_salary:
                    new_salary = min_salary
                contract.salary = new_salary
                print(f"  [CONTRACT] Fixed salary: {salary:,.0f} -> {new_salary:,.0f}")
            else:
                new_salary = salary
                print(f"  [CONTRACT] OK: {salary:,.0f}")
            # Ensure start_date is before our target month
            if contract.start_date and contract.start_date > "2026-03-01":
                contract.start_date = "2026-03-01"
                print(f"  [CONTRACT] Fixed start_date -> 2026-03-01")
        else:
            new_salary = SALARY_MAP.get(role, 8000000)
            if new_salary < min_salary:
                new_salary = min_salary
            dept_id = emp.department_id or (fallback_dept.id if fallback_dept else None)
            pos_id = emp.job_position_id or (fallback_pos.id if fallback_pos else None)
            contract = Contract(
                employee_id=emp.id,
                reference=f"CTR-2026-{emp.id:03d}",
                contract_type="permanent",
                start_date="2026-03-01",
                salary=new_salary,
                wage_type="monthly",
                department_id=dept_id,
                job_position_id=pos_id,
                status="running",
            )
            db.add(contract)
            db.flush()
            print(f"  [CONTRACT] Created: {new_salary:,.0f}")

        base_salary = float(contract.salary)

        # Also fix hire_date if needed
        if not emp.hire_date or emp.hire_date > "2026-03-01":
            emp.hire_date = "2026-03-01"

        # ═══════════════════════════════════════════════════
        # STEP 2: Ensure attendance for the full month
        # ═══════════════════════════════════════════════════
        existing_att_dates = set(
            r[0] for r in db.query(Attendance.date).filter(
                Attendance.employee_id == emp.id,
                Attendance.date >= START_DATE.strftime("%Y-%m-%d"),
                Attendance.date <= END_DATE.strftime("%Y-%m-%d"),
            ).all()
        )

        att_created = 0
        ot_created = 0
        total_worked = 0.0
        total_ot = 0.0
        working_days = 0
        current = START_DATE

        while current <= END_DATE:
            if current.weekday() >= 5:
                current += timedelta(days=1)
                continue

            date_str = current.strftime("%Y-%m-%d")
            working_days += 1

            if date_str in existing_att_dates:
                # Already has attendance, sum its hours
                att = db.query(Attendance).filter(
                    Attendance.employee_id == emp.id,
                    Attendance.date == date_str,
                ).first()
                if att:
                    total_worked += float(att.worked_hours or 0)
                    total_ot += float(att.overtime_hours or 0)
                current += timedelta(days=1)
                continue

            # Generate attendance
            day = current.day
            if day % 6 == 0:
                cin = datetime(YEAR, MONTH, day, 7, 50)
                cout = datetime(YEAR, MONTH, day, 18, random.randint(10, 45))
            elif day % 9 == 0:
                cin = datetime(YEAR, MONTH, day, 8, 10)
                cout = datetime(YEAR, MONTH, day, 17, 0)
            else:
                cin = datetime(YEAR, MONTH, day, 7, 55 + random.randint(0, 4))
                cout = datetime(YEAR, MONTH, day, 17, 25 + random.randint(0, 10))

            diff = (cout - cin).total_seconds() / 3600
            worked = round(max(0, diff), 2)
            ot = round(max(0, diff - 8), 2)
            cin_status = "late" if cin.hour > 8 or (cin.hour == 8 and cin.minute > 15) else "ontime"

            att = Attendance(
                employee_id=emp.id, date=date_str,
                check_in=cin, check_out=cout,
                check_in_status=cin_status,
                worked_hours=worked, overtime_hours=ot,
                status="present",
            )
            db.add(att)
            att_created += 1
            total_worked += worked
            total_ot += ot

            # Create overtime record if OT > 0
            if ot > 0:
                existing_ot = db.query(Overtime).filter(
                    Overtime.employee_id == emp.id,
                    Overtime.date == date_str,
                ).first()
                if not existing_ot:
                    ot_start = cin + timedelta(hours=8)
                    db.add(Overtime(
                        employee_id=emp.id, date=date_str,
                        start_time=ot_start.strftime("%H:%M"),
                        end_time=cout.strftime("%H:%M"),
                        hours=ot, reason="Tang ca (tu dong)",
                        status="approved", notes="Tu dong tu cham cong",
                    ))
                    ot_created += 1

            current += timedelta(days=1)

        if att_created > 0:
            print(f"  [ATTENDANCE] Created {att_created} records, OT records: {ot_created}")
        else:
            print(f"  [ATTENDANCE] Already complete ({working_days} days)")

        # ═══════════════════════════════════════════════════
        # STEP 3: Create/update WorkingHour
        # ═══════════════════════════════════════════════════
        wh = db.query(WorkingHour).filter(
            WorkingHour.employee_id == emp.id,
            WorkingHour.period == PERIOD,
        ).first()

        if wh:
            wh.standard_hours = 176
            wh.actual_hours = round(total_worked, 2)
            wh.overtime_hours = round(total_ot, 2)
            wh.working_days = working_days
            print(f"  [WH] Updated: actual={total_worked:.1f}h, OT={total_ot:.1f}h")
        else:
            wh = WorkingHour(
                employee_id=emp.id, period=PERIOD,
                standard_hours=176,
                actual_hours=round(total_worked, 2),
                overtime_hours=round(total_ot, 2),
                working_days=working_days,
                late_hours=0, absent_days=0,
            )
            db.add(wh)
            print(f"  [WH] Created: actual={total_worked:.1f}h, OT={total_ot:.1f}h")

        # ═══════════════════════════════════════════════════
        # STEP 4: Calculate payroll
        # ═══════════════════════════════════════════════════
        hourly_rate = base_salary / 176 if 176 > 0 else 0
        overtime_pay = round(total_ot * hourly_rate * 1.5, 2)

        incentive_total = 0.0
        for inc in incentives:
            if inc.applicable_to == "department" and inc.department_id != emp.department_id:
                continue
            if inc.applicable_to == "position" and inc.job_position_id != emp.job_position_id:
                continue
            if inc.rate_type == "fixed":
                incentive_total += float(inc.rate_value)
            elif inc.rate_type == "percentage":
                incentive_total += base_salary * float(inc.rate_value) / 100
            elif inc.rate_type == "per_hour":
                incentive_total += float(inc.rate_value) * total_worked

        incentive_total = round(incentive_total, 2)
        gross = round(base_salary + overtime_pay + incentive_total, 2)
        deductions = round(base_salary * 0.105, 2)
        net = round(gross - deductions, 2)

        ps = db.query(PayrollSummary).filter(
            PayrollSummary.employee_id == emp.id,
            PayrollSummary.period == PERIOD,
        ).first()

        if ps:
            ps.base_salary = base_salary
            ps.overtime_pay = overtime_pay
            ps.incentive_total = incentive_total
            ps.deductions = deductions
            ps.gross_salary = gross
            ps.net_salary = net
            if ps.status == "draft":
                ps.status = "paid"
                ps.paid_at = datetime(2026, 5, 5, 10, 0, 0)
            print(f"  [PAYROLL] Updated: net={net:,.0f}")
        else:
            ps = PayrollSummary(
                employee_id=emp.id, period=PERIOD,
                base_salary=base_salary, overtime_pay=overtime_pay,
                incentive_total=incentive_total, deductions=deductions,
                gross_salary=gross, net_salary=net,
                status="paid", paid_at=datetime(2026, 5, 5, 10, 0, 0),
            )
            db.add(ps)
            print(f"  [PAYROLL] Created: net={net:,.0f}")

        print()

    db.commit()
    print("=" * 60)
    print("ALL DONE! Running final audit...\n")

    # Final audit
    for e in emps:
        ct = db.query(Contract).filter(Contract.employee_id == e.id, Contract.status == 'running').first()
        sal = float(ct.salary) if ct else 0
        ps = db.query(PayrollSummary).filter(PayrollSummary.employee_id == e.id, PayrollSummary.period == PERIOD).first()
        att_count = db.query(sa_func.count(Attendance.id)).filter(
            Attendance.employee_id == e.id,
            Attendance.date >= "2026-04-01",
            Attendance.date <= "2026-04-30",
        ).scalar()
        ot_count = db.query(sa_func.count(Overtime.id)).filter(
            Overtime.employee_id == e.id,
            Overtime.date >= "2026-04-01",
            Overtime.date <= "2026-04-30",
        ).scalar()
        net = float(ps.net_salary) if ps else 0
        print(f"  [{e.id:2d}] {e.name:25s} sal={sal:>12,.0f}  ATT={att_count:2d}  OT={ot_count:2d}  net={net:>12,.0f}  [{ps.status if ps else 'NONE'}]")

except Exception as ex:
    db.rollback()
    print(f"ERROR: {ex}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
