"""
Migration: Add role and manager_id columns to employees table.
Also seeds org hierarchy data.
Run: set PYTHONIOENCODING=utf-8 && python migrate_org.py
"""
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text, inspect
from database import engine, SessionLocal
from models import Employee, Department, JobPosition, Base


# -- Step 1: Add columns if missing --

def add_columns():
    inspector = inspect(engine)
    existing = [c["name"] for c in inspector.get_columns("employees")]

    with engine.begin() as conn:
        if "role" not in existing:
            conn.execute(text("ALTER TABLE employees ADD COLUMN role VARCHAR(30) NOT NULL DEFAULT 'staff'"))
            print("[+] Added column 'role' to employees")
        else:
            print("[OK] Column 'role' already exists")

        if "manager_id" not in existing:
            conn.execute(text("ALTER TABLE employees ADD COLUMN manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL"))
            print("[+] Added column 'manager_id' to employees")
        else:
            print("[OK] Column 'manager_id' already exists")


# -- Step 2: Auto-assign roles based on job position names --

ROLE_MAP = {
    "ceo": "director", "cto": "director", "cfo": "director",
    "director": "director",
    "manager": "department_head", "head": "department_head",
    "senior": "team_lead", "lead": "team_lead",
}


def auto_assign_roles():
    db = SessionLocal()
    try:
        employees = db.query(Employee).all()
        updated = 0
        for emp in employees:
            if emp.role and emp.role != "staff":
                continue

            pos_name = ""
            if emp.job_position:
                pos_name = emp.job_position.name.lower()

            assigned_role = "staff"
            for keyword, role in ROLE_MAP.items():
                if keyword in pos_name:
                    assigned_role = role
                    break

            if assigned_role != (emp.role or "staff"):
                emp.role = assigned_role
                updated += 1

        db.commit()
        print(f"[+] Auto-assigned roles for {updated} employees")
    finally:
        db.close()


# -- Step 3: Create CEO and assign manager hierarchy --

def seed_hierarchy():
    db = SessionLocal()
    try:
        director = db.query(Employee).filter(Employee.role == "director").first()

        if not director:
            ceo_pos = db.query(JobPosition).filter(JobPosition.name.ilike("%ceo%")).first()
            if not ceo_pos:
                ceo_pos = JobPosition(name="CEO", description="Chief Executive Officer")
                db.add(ceo_pos)
                db.flush()

            director = Employee(
                name="Nguyen Van An",
                email="an.nguyen@techcorp.com",
                phone="+84-909-000-001",
                company="TechCorp",
                work_email="ceo@techcorp.com",
                work_phone="+84-909-000-001",
                work_address="123 Tech Avenue, San Francisco, CA",
                hire_date="2020-01-01",
                status="active",
                avatar_color="#1a1a2e",
                role="director",
                job_position_id=ceo_pos.id,
            )
            db.add(director)
            db.flush()
            print(f"[+] Created CEO: {director.name} (id={director.id})")
        else:
            print(f"[OK] Director already exists: {director.name} (id={director.id})")

        # Dept heads -> CEO
        dept_heads = db.query(Employee).filter(Employee.role == "department_head").all()
        for head in dept_heads:
            if not head.manager_id:
                head.manager_id = director.id

        # Team leads -> dept head of same dept
        team_leads = db.query(Employee).filter(Employee.role == "team_lead").all()
        for lead in team_leads:
            if not lead.manager_id and lead.department_id:
                dept_head = (
                    db.query(Employee)
                    .filter(Employee.department_id == lead.department_id, Employee.role == "department_head")
                    .first()
                )
                lead.manager_id = dept_head.id if dept_head else director.id

        # Staff -> team lead or dept head of same dept
        staff_list = db.query(Employee).filter(Employee.role.in_(["staff", "senior"])).all()
        for s in staff_list:
            if not s.manager_id and s.department_id:
                lead = (
                    db.query(Employee)
                    .filter(Employee.department_id == s.department_id, Employee.role == "team_lead", Employee.id != s.id)
                    .first()
                )
                if lead:
                    s.manager_id = lead.id
                else:
                    head = (
                        db.query(Employee)
                        .filter(Employee.department_id == s.department_id, Employee.role == "department_head")
                        .first()
                    )
                    s.manager_id = head.id if head else director.id

        db.commit()
        print("[+] Assigned manager hierarchy")

        # Print summary
        for role_name in ["director", "department_head", "team_lead", "senior", "staff"]:
            count = db.query(Employee).filter(Employee.role == role_name, Employee.status == "active").count()
            print(f"    {role_name}: {count}")

    finally:
        db.close()


if __name__ == "__main__":
    print("=== Org Chart Migration ===")
    add_columns()
    auto_assign_roles()
    seed_hierarchy()
    print("=== Done! ===")
