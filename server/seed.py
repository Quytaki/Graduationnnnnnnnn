"""Seed the database with sample data."""
from database import SessionLocal, engine, Base
from models import Department, JobPosition, Employee

# Create tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Clear existing
db.query(Employee).delete()
db.query(JobPosition).delete()
db.query(Department).delete()
db.commit()

# ── Departments ──────────────────────────────────────────
departments_data = [
    {"name": "Engineering",      "company": "TechCorp",      "description": "Software development and technical operations",  "color": "#714B67"},
    {"name": "Human Resources",  "company": "TechCorp",      "description": "People management and recruitment",             "color": "#00A09D"},
    {"name": "Sales",            "company": "TechCorp",      "description": "Revenue generation and client relations",       "color": "#059669"},
    {"name": "Finance",          "company": "TechCorp",      "description": "Financial planning, accounting and audit",      "color": "#0891B2"},
    {"name": "Design",           "company": "DesignStudio",  "description": "UI/UX design and creative direction",           "color": "#D97706"},
    {"name": "Marketing",        "company": "DesignStudio",  "description": "Brand management and digital marketing",        "color": "#7C3AED"},
]

dept_map = {}
for d in departments_data:
    dept = Department(**d)
    db.add(dept)
    db.flush()
    dept_map[d["name"]] = dept.id

# ── Job Positions ────────────────────────────────────────
jobs_data = [
    {"name": "Software Engineer",        "department_id": dept_map["Engineering"],       "description": "Develop and maintain software applications"},
    {"name": "Senior Software Engineer", "department_id": dept_map["Engineering"],       "description": "Lead technical development efforts"},
    {"name": "HR Manager",               "department_id": dept_map["Human Resources"],   "description": "Manage HR operations and policy"},
    {"name": "HR Specialist",            "department_id": dept_map["Human Resources"],   "description": "Handle recruitment and employee relations"},
    {"name": "Sales Representative",     "department_id": dept_map["Sales"],             "description": "Manage client accounts and drive sales"},
    {"name": "Financial Analyst",        "department_id": dept_map["Finance"],           "description": "Analyze financial data and prepare reports"},
    {"name": "UI/UX Designer",           "department_id": dept_map["Design"],            "description": "Design user interfaces and experiences"},
    {"name": "Marketing Specialist",     "department_id": dept_map["Marketing"],         "description": "Plan and execute marketing campaigns"},
    {"name": "DevOps Engineer",          "department_id": dept_map["Engineering"],       "description": "Manage deployment infrastructure and CI/CD"},
    {"name": "Accountant",               "department_id": dept_map["Finance"],           "description": "Handle bookkeeping and financial transactions"},
]

job_map = {}
for j in jobs_data:
    job = JobPosition(**j)
    db.add(job)
    db.flush()
    job_map[j["name"]] = job.id

# ── Employees ────────────────────────────────────────────
employees_data = [
    {"name": "John Smith",       "email": "john.smith@gmail.com",   "phone": "+1-555-0101", "department_id": dept_map["Engineering"],      "job_position_id": job_map["Senior Software Engineer"], "company": "TechCorp",      "work_address": "123 Tech Avenue, San Francisco, CA", "work_email": "john.smith@techcorp.com",        "work_phone": "+1-555-1001", "hire_date": "2023-03-15", "status": "active",   "avatar_color": "#714B67"},
    {"name": "Sarah Johnson",    "email": "sarah.j@gmail.com",     "phone": "+1-555-0102", "department_id": dept_map["Human Resources"],   "job_position_id": job_map["HR Manager"],               "company": "TechCorp",      "work_address": "123 Tech Avenue, San Francisco, CA", "work_email": "sarah.johnson@techcorp.com",     "work_phone": "+1-555-1002", "hire_date": "2022-08-01", "status": "active",   "avatar_color": "#00A09D"},
    {"name": "Michael Chen",     "email": "mchen@gmail.com",       "phone": "+1-555-0103", "department_id": dept_map["Engineering"],       "job_position_id": job_map["Software Engineer"],        "company": "TechCorp",      "work_address": "123 Tech Avenue, San Francisco, CA", "work_email": "michael.chen@techcorp.com",      "work_phone": "+1-555-1003", "hire_date": "2024-01-10", "status": "active",   "avatar_color": "#4A90A4"},
    {"name": "Emily Davis",      "email": "emily.d@gmail.com",     "phone": "+1-555-0104", "department_id": dept_map["Design"],            "job_position_id": job_map["UI/UX Designer"],           "company": "DesignStudio",  "work_address": "456 Creative Blvd, New York, NY",    "work_email": "emily.davis@designstudio.com",   "work_phone": "+1-555-2001", "hire_date": "2023-06-20", "status": "active",   "avatar_color": "#D97706"},
    {"name": "Robert Wilson",    "email": "r.wilson@gmail.com",    "phone": "+1-555-0105", "department_id": dept_map["Sales"],             "job_position_id": job_map["Sales Representative"],     "company": "TechCorp",      "work_address": "123 Tech Avenue, San Francisco, CA", "work_email": "robert.wilson@techcorp.com",     "work_phone": "+1-555-1005", "hire_date": "2024-04-01", "status": "active",   "avatar_color": "#059669"},
    {"name": "Amanda Martinez",  "email": "amanda.m@gmail.com",    "phone": "+1-555-0106", "department_id": dept_map["Marketing"],         "job_position_id": job_map["Marketing Specialist"],     "company": "DesignStudio",  "work_address": "456 Creative Blvd, New York, NY",    "work_email": "amanda.martinez@designstudio.com","work_phone": "+1-555-2002", "hire_date": "2023-09-12", "status": "active",   "avatar_color": "#7C3AED"},
    {"name": "David Brown",      "email": "dbrown@gmail.com",      "phone": "+1-555-0107", "department_id": dept_map["Engineering"],       "job_position_id": job_map["DevOps Engineer"],          "company": "TechCorp",      "work_address": "123 Tech Avenue, San Francisco, CA", "work_email": "david.brown@techcorp.com",       "work_phone": "+1-555-1007", "hire_date": "2023-11-05", "status": "active",   "avatar_color": "#DC2626"},
    {"name": "Lisa Anderson",    "email": "lisa.a@gmail.com",      "phone": "+1-555-0108", "department_id": dept_map["Design"],            "job_position_id": job_map["UI/UX Designer"],           "company": "DesignStudio",  "work_address": "456 Creative Blvd, New York, NY",    "work_email": "lisa.anderson@designstudio.com", "work_phone": "+1-555-2003", "hire_date": "2024-02-18", "status": "active",   "avatar_color": "#EC4899"},
    {"name": "James Taylor",     "email": "jtaylor@gmail.com",     "phone": "+1-555-0109", "department_id": dept_map["Finance"],           "job_position_id": job_map["Financial Analyst"],        "company": "TechCorp",      "work_address": "123 Tech Avenue, San Francisco, CA", "work_email": "james.taylor@techcorp.com",      "work_phone": "+1-555-1009", "hire_date": "2022-12-01", "status": "active",   "avatar_color": "#0891B2"},
    {"name": "Jennifer White",   "email": "jwhite@gmail.com",      "phone": "+1-555-0110", "department_id": dept_map["Human Resources"],   "job_position_id": job_map["HR Specialist"],            "company": "DesignStudio",  "work_address": "456 Creative Blvd, New York, NY",    "work_email": "jennifer.white@designstudio.com","work_phone": "+1-555-2004", "hire_date": "2024-05-30", "status": "active",   "avatar_color": "#8B5CF6"},
    {"name": "Thomas Lee",       "email": "tlee@gmail.com",        "phone": "+1-555-0111", "department_id": dept_map["Engineering"],       "job_position_id": job_map["Software Engineer"],        "company": "TechCorp",      "work_address": "123 Tech Avenue, San Francisco, CA", "work_email": "thomas.lee@techcorp.com",        "work_phone": "+1-555-1011", "hire_date": "2023-07-22", "status": "active",   "avatar_color": "#2563EB"},
    {"name": "Maria Garcia",     "email": "mgarcia@gmail.com",     "phone": "+1-555-0112", "department_id": dept_map["Finance"],           "job_position_id": job_map["Accountant"],               "company": "TechCorp",      "work_address": "123 Tech Avenue, San Francisco, CA", "work_email": "maria.garcia@techcorp.com",      "work_phone": "+1-555-1012", "hire_date": "2024-03-08", "status": "active",   "avatar_color": "#F59E0B"},
    {"name": "Kevin Park",       "email": "kpark@gmail.com",       "phone": "+1-555-0113", "department_id": dept_map["Sales"],             "job_position_id": job_map["Sales Representative"],     "company": "TechCorp",      "work_address": "123 Tech Avenue, San Francisco, CA", "work_email": "kevin.park@techcorp.com",        "work_phone": "+1-555-1013", "hire_date": "2022-06-14", "status": "archived", "avatar_color": "#6366F1"},
    {"name": "Rachel Kim",       "email": "rkim@gmail.com",        "phone": "+1-555-0114", "department_id": dept_map["Marketing"],         "job_position_id": job_map["Marketing Specialist"],     "company": "DesignStudio",  "work_address": "456 Creative Blvd, New York, NY",    "work_email": "rachel.kim@designstudio.com",    "work_phone": "+1-555-2005", "hire_date": "2023-10-01", "status": "active",   "avatar_color": "#14B8A6"},
    {"name": "Daniel Nguyen",    "email": "dnguyen@gmail.com",     "phone": "+1-555-0115", "department_id": dept_map["Engineering"],       "job_position_id": job_map["Software Engineer"],        "company": "TechCorp",      "work_address": "123 Tech Avenue, San Francisco, CA", "work_email": "daniel.nguyen@techcorp.com",     "work_phone": "+1-555-1015", "hire_date": "2024-07-15", "status": "active",   "avatar_color": "#E11D48"},
]

for e in employees_data:
    db.add(Employee(**e))

db.commit()
db.close()

print("[OK] Database seeded successfully!")
print(f"   - {len(departments_data)} departments")
print(f"   - {len(jobs_data)} job positions")
print(f"   - {len(employees_data)} employees")
