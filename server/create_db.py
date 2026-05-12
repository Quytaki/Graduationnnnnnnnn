"""Create the hrm_db database if it doesn't exist."""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

conn = psycopg2.connect(host="localhost", port=5432, user="postgres", password="1", dbname="postgres")
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()

cur.execute("SELECT 1 FROM pg_database WHERE datname = 'hrm_db'")
exists = cur.fetchone()

if not exists:
    cur.execute("CREATE DATABASE hrm_db")
    print("✅ Database 'hrm_db' created successfully!")
else:
    print("ℹ️  Database 'hrm_db' already exists.")

cur.close()
conn.close()
