import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import employees, departments, job_positions, contracts, terminations, working_hours, incentive_rates, payroll, auth, users, attendances, leaves, ess, org_chart, company_locations
from routers import recruitment, ai_screening, recruitment_email, recruitment_reports
from routers import admin

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="HRM System API", version="1.0.0")

# CORS — allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(employees.router)
app.include_router(departments.router)
app.include_router(job_positions.router)
app.include_router(contracts.router)
app.include_router(terminations.router)
app.include_router(working_hours.router)
app.include_router(incentive_rates.router)
app.include_router(payroll.router)
app.include_router(attendances.router)
app.include_router(leaves.router)
app.include_router(ess.router)
app.include_router(org_chart.router)
app.include_router(company_locations.router)
app.include_router(recruitment.router)
app.include_router(ai_screening.router)
app.include_router(recruitment_email.router)
app.include_router(recruitment_reports.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"message": "HRM System API", "docs": "/docs"}
