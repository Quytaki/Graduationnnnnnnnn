"""
Seed script: create default admin account.
Run: python seed_admin.py
"""
from database import engine, SessionLocal, Base
from models import User
from auth import hash_password


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == "admin").first()
        if existing:
            print("Admin account already exists — skipping.")
            return

        admin = User(
            username="admin",
            hashed_password=hash_password("admin123"),
            full_name="Administrator",
            role="admin",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print("Admin account created successfully!")
        print("  Username: admin")
        print("  Password: admin123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
