"""
Migration script: Add GPS columns to attendances table + create company_locations table.
Run this once to update the existing database schema.
"""
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:1@localhost:5432/hrm_db"
engine = create_engine(DATABASE_URL)

migrations = [
    # 1. Create company_locations table (if not exists)
    """
    CREATE TABLE IF NOT EXISTS company_locations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        address TEXT,
        latitude FLOAT NOT NULL,
        longitude FLOAT NOT NULL,
        radius_meters INTEGER DEFAULT 200,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    """,

    # 2. Add GPS columns to attendances table
    "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_in_lat FLOAT;",
    "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_in_lng FLOAT;",
    "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_out_lat FLOAT;",
    "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_out_lng FLOAT;",
    "ALTER TABLE attendances ADD COLUMN IF NOT EXISTS check_in_location_id INTEGER REFERENCES company_locations(id);",
]


if __name__ == "__main__":
    print("Running attendance GPS migrations...")
    with engine.connect() as conn:
        for i, sql in enumerate(migrations):
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"  [{i+1}/{len(migrations)}] OK")
            except Exception as e:
                conn.rollback()
                print(f"  [{i+1}/{len(migrations)}] Skipped (already exists or error): {e}")
    print("Done!")
