"""
Seed script: create User accounts for all Employees.
Run: python seed_users.py
"""
import sys
import os

# Ensure the server directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal
from models import User, Employee
from auth import hash_password

def seed_users():
    db = SessionLocal()
    try:
        employees = db.query(Employee).all()
        created = 0
        skipped = 0
        
        for emp in employees:
            if not emp.email:
                continue
                
            # Create a username from email (e.g., john.smith@gmail.com -> john.smith)
            username = emp.email.split('@')[0].lower()
            
            # Check if user exists
            existing = db.query(User).filter(User.username == username).first()
            if existing:
                # Update employee_id just in case it wasn't linked
                existing.employee_id = emp.id
                skipped += 1
                continue
                
            new_user = User(
                username=username,
                hashed_password=hash_password("password123"),  # Default password
                full_name=emp.name,
                role="employee",
                employee_id=emp.id,
                is_active=True,
            )
            db.add(new_user)
            created += 1
            
        db.commit()
        print(f"Created {created} user accounts for employees.")
        print(f"Skipped {skipped} existing accounts.")
        print("Now employees can log in using their email prefix (e.g., 'john.smith') and password 'password123'.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
