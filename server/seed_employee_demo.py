"""
Seed script: Create 1 employee with full 1-month data
- Employee + Department + Position
- Contract 8,000,000 VND/month (running)
- 1 month attendance (April 2026)
- Payroll summary (paid)
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timedelta
from database import SessionLocal
from models import Employee, Department, JobPosition, Contract, Attendance, Overtime, WorkingHour, PayrollSummary, IncentiveRate

db = SessionLocal()

try:
    # ── 1. Get or use existing department & position ──────────
    dept = db.query(Department).first()
    pos = db.query(JobPosition).first()

    if not dept:
        dept = Department(name="Phòng Kỹ thuật", company="TechCorp", color="#4F46E5")
        db.add(dept)
        db.flush()

    if not pos:
        pos = JobPosition(name="Kỹ sư phần mềm", department_id=dept.id)
        db.add(pos)
        db.flush()

    # ── 2. Create employee ────────────────────────────────────
    emp = Employee(
        name="Phạm Minh Tuấn",
        email="phamminhtuan@company.com",
        phone="0901234567",
        department_id=dept.id,
        job_position_id=pos.id,
        company="TechCorp",
        work_email="tuan.pham@techcorp.vn",
        hire_date="2026-03-01",
        status="active",
        role="staff",
        avatar_color="#2563EB",
    )
    db.add(emp)
    db.flush()
    print(f"✅ Employee created: {emp.name} (ID: {emp.id})")
    print(f"   Dept: {dept.name}, Position: {pos.name}")

    # ── 3. Create contract (running, 8M VND) ──────────────────
    contract = Contract(
        employee_id=emp.id,
        reference=f"CTR-2026-{emp.id:03d}",
        contract_type="permanent",
        start_date="2026-03-01",
        end_date=None,
        salary=8000000,
        wage_type="monthly",
        department_id=dept.id,
        job_position_id=pos.id,
        status="running",
    )
    db.add(contract)
    db.flush()
    print(f"✅ Contract created: {contract.reference}, salary: 8,000,000 ₫, status: running")

    # ── 4. Generate attendance for April 2026 ─────────────────
    period = "2026-04"
    start_date = datetime(2026, 4, 1).date()
    end_date = datetime(2026, 4, 30).date()

    total_worked = 0
    total_ot = 0
    working_days = 0
    current = start_date

    while current <= end_date:
        if current.weekday() >= 5:  # skip weekends
            current += timedelta(days=1)
            continue

        date_str = current.strftime("%Y-%m-%d")
        day_of_month = current.day

        # Vary check-in/out times for realism
        if day_of_month % 5 == 0:
            # Some days work late (OT)
            cin = datetime(2026, current.month, current.day, 7, 55)
            cout = datetime(2026, current.month, current.day, 18, 30)
        elif day_of_month % 7 == 0:
            # Some days leave early
            cin = datetime(2026, current.month, current.day, 8, 10)
            cout = datetime(2026, current.month, current.day, 17, 0)
        else:
            # Normal day
            cin = datetime(2026, current.month, current.day, 8, 0)
            cout = datetime(2026, current.month, current.day, 17, 30)

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

        # Create overtime record if OT > 0
        if ot > 0:
            ot_start = cin + timedelta(hours=8)
            ot_record = Overtime(
                employee_id=emp.id, date=date_str,
                start_time=ot_start.strftime("%H:%M"),
                end_time=cout.strftime("%H:%M"),
                hours=ot,
                reason="Tăng ca (tự động từ chấm công)",
                status="approved",
                notes="Tự động từ chấm công",
            )
            db.add(ot_record)
            total_ot += ot

        total_worked += worked
        working_days += 1
        current += timedelta(days=1)

    db.flush()
    print(f"✅ Attendance: {working_days} working days in {period}")
    print(f"   Total worked: {total_worked:.1f}h, OT: {total_ot:.1f}h")

    # ── 5. Create WorkingHour record ──────────────────────────
    wh = WorkingHour(
        employee_id=emp.id,
        period=period,
        standard_hours=176,
        actual_hours=round(total_worked, 2),
        overtime_hours=round(total_ot, 2),
        working_days=working_days,
        late_hours=0,
        absent_days=0,
    )
    db.add(wh)
    db.flush()
    print(f"✅ WorkingHour: standard=176h, actual={total_worked:.1f}h, OT={total_ot:.1f}h")

    # ── 6. Calculate & create payroll (paid) ──────────────────
    base_salary = 8000000.0
    hourly_rate = base_salary / 176
    overtime_pay = round(total_ot * hourly_rate * 1.5, 2)

    # Get applicable incentives
    incentives = db.query(IncentiveRate).filter(IncentiveRate.is_active == "active").all()
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

    incentive_total = round(incentive_total, 2)
    gross = round(base_salary + overtime_pay + incentive_total, 2)
    deductions = round(base_salary * 0.105, 2)  # BHXH 8% + BHYT 1.5% + BHTN 1%
    net = round(gross - deductions, 2)

    ps = PayrollSummary(
        employee_id=emp.id,
        period=period,
        base_salary=base_salary,
        overtime_pay=overtime_pay,
        incentive_total=incentive_total,
        deductions=deductions,
        gross_salary=gross,
        net_salary=net,
        status="paid",
        paid_at=datetime(2026, 5, 5, 10, 0, 0),
    )
    db.add(ps)
    db.flush()

    print(f"✅ Payroll ({period}) - PAID:")
    print(f"   Lương CB:    {base_salary:>12,.0f} ₫")
    print(f"   Tăng ca:     {overtime_pay:>12,.0f} ₫")
    print(f"   Phụ cấp:     {incentive_total:>12,.0f} ₫")
    print(f"   Khấu trừ:    {deductions:>12,.0f} ₫")
    print(f"   Tổng:        {gross:>12,.0f} ₫")
    print(f"   Thực nhận:   {net:>12,.0f} ₫")

    db.commit()
    print(f"\n🎉 Done! Employee '{emp.name}' created with full April 2026 data.")

except Exception as e:
    db.rollback()
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
