"""
Migration: Add workflow columns to contracts, terminations, payroll_summaries.
Safe, additive changes only (nullable columns).
Run: set PYTHONIOENCODING=utf-8 && python migrate_workflow.py
"""
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text, inspect
from database import engine


def migrate():
    inspector = inspect(engine)

    with engine.begin() as conn:
        # ── contracts table ──
        contract_cols = [c["name"] for c in inspector.get_columns("contracts")]

        if "approved_by" not in contract_cols:
            conn.execute(text("ALTER TABLE contracts ADD COLUMN approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL"))
            print("[+] contracts: added 'approved_by'")
        else:
            print("[OK] contracts: 'approved_by' exists")

        if "approved_at" not in contract_cols:
            conn.execute(text("ALTER TABLE contracts ADD COLUMN approved_at TIMESTAMP"))
            print("[+] contracts: added 'approved_at'")
        else:
            print("[OK] contracts: 'approved_at' exists")

        # Mark existing 'running' contracts as already approved (backward compat)
        result = conn.execute(text(
            "UPDATE contracts SET approved_at = created_at WHERE status = 'running' AND approved_at IS NULL"
        ))
        print(f"    [*] Marked {result.rowcount} existing running contracts as approved")

        # ── terminations table ──
        term_cols = [c["name"] for c in inspector.get_columns("terminations")]

        if "approved_by" not in term_cols:
            conn.execute(text("ALTER TABLE terminations ADD COLUMN approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL"))
            print("[+] terminations: added 'approved_by'")
        else:
            print("[OK] terminations: 'approved_by' exists")

        # ── payroll_summaries table ──
        payroll_cols = [c["name"] for c in inspector.get_columns("payroll_summaries")]

        if "confirmed_by" not in payroll_cols:
            conn.execute(text("ALTER TABLE payroll_summaries ADD COLUMN confirmed_by INTEGER REFERENCES users(id) ON DELETE SET NULL"))
            print("[+] payroll_summaries: added 'confirmed_by'")
        else:
            print("[OK] payroll_summaries: 'confirmed_by' exists")

        if "confirmed_at" not in payroll_cols:
            conn.execute(text("ALTER TABLE payroll_summaries ADD COLUMN confirmed_at TIMESTAMP"))
            print("[+] payroll_summaries: added 'confirmed_at'")
        else:
            print("[OK] payroll_summaries: 'confirmed_at' exists")

        if "paid_at" not in payroll_cols:
            conn.execute(text("ALTER TABLE payroll_summaries ADD COLUMN paid_at TIMESTAMP"))
            print("[+] payroll_summaries: added 'paid_at'")
        else:
            print("[OK] payroll_summaries: 'paid_at' exists")

    print("=== Workflow Migration Done! ===")


if __name__ == "__main__":
    print("=== Workflow Migration ===")
    migrate()
