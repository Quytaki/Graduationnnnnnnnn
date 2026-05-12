"""
One-time script: Sync existing attendance OT hours to overtime records.
Creates Overtime records for all attendances that have overtime_hours > 0
but no corresponding Overtime record.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import timedelta
from database import SessionLocal
from models import Attendance, Overtime

db = SessionLocal()

try:
    # Find all attendances with OT > 0
    att_with_ot = db.query(Attendance).filter(Attendance.overtime_hours > 0).all()
    print(f"Found {len(att_with_ot)} attendance records with OT > 0")

    created = 0
    skipped = 0

    for att in att_with_ot:
        # Check if overtime record already exists for this employee+date
        existing = db.query(Overtime).filter(
            Overtime.employee_id == att.employee_id,
            Overtime.date == att.date,
        ).first()

        if existing:
            skipped += 1
            continue

        # Calculate start/end times
        start_time = None
        end_time = None
        if att.check_out and att.check_in:
            try:
                ot_start = att.check_in + timedelta(hours=8)
                start_time = ot_start.strftime("%H:%M")
                end_time = att.check_out.strftime("%H:%M")
            except Exception:
                pass

        ot = Overtime(
            employee_id=att.employee_id,
            date=att.date,
            start_time=start_time,
            end_time=end_time,
            hours=float(att.overtime_hours),
            reason="Tăng ca (tự động từ chấm công)",
            status="approved",
            notes="Tự động từ chấm công",
        )
        db.add(ot)
        created += 1

    db.commit()
    print(f"Done! Created: {created}, Skipped (already exists): {skipped}")

except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
