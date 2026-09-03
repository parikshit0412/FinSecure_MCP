import os
import sqlite3
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgrespassword@localhost:5432/finsecure_db")
FORCE_SQLITE = os.getenv("USE_SQLITE", "").lower() in ("true", "1", "yes")

# Path for SQLite local fallback
SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), "finsecure.db")

_DB_ENGINE = None  # "postgres" or "sqlite"

class SQLiteDictCursor:
    """Wrapper around sqlite3 cursor to emulate psycopg2 RealDictCursor with %s support."""
    def __init__(self, cursor: sqlite3.Cursor):
        self._cursor = cursor

    def execute(self, sql: str, params: Optional[Any] = None):
        # Convert %s placeholder to ? for sqlite3
        converted_sql = sql.replace("%s", "?")
        if params is not None:
            if isinstance(params, list):
                params = tuple(params)
            elif not isinstance(params, (tuple, dict)):
                params = (params,)
            return self._cursor.execute(converted_sql, params)
        return self._cursor.execute(converted_sql)

    def fetchone(self) -> Optional[Dict[str, Any]]:
        row = self._cursor.fetchone()
        if row is None:
            return None
        return dict(row)

    def fetchall(self) -> List[Dict[str, Any]]:
        rows = self._cursor.fetchall()
        return [dict(r) for r in rows]

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._cursor.close()

class SQLiteConnectionWrapper:
    """Context manager for SQLite behaving like psycopg2 connection."""
    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn
        self._conn.row_factory = sqlite3.Row

    def cursor(self):
        return SQLiteDictCursor(self._conn.cursor())

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self._conn.rollback()
        else:
            self._conn.commit()
        self._conn.close()

def get_db_engine() -> str:
    global _DB_ENGINE
    if _DB_ENGINE is not None:
        return _DB_ENGINE

    if FORCE_SQLITE:
        _DB_ENGINE = "sqlite"
        return _DB_ENGINE

    # Try PostgreSQL first
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor, connect_timeout=2)
        conn.close()
        _DB_ENGINE = "postgres"
    except Exception:
        _DB_ENGINE = "sqlite"

    return _DB_ENGINE

def get_db():
    engine = get_db_engine()
    if engine == "postgres":
        import psycopg2
        from psycopg2.extras import RealDictCursor
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    else:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        return SQLiteConnectionWrapper(conn)

def init_and_seed_db():
    engine = get_db_engine()
    print(f"[*] Initializing FinSecure database engine: [{engine.upper()}]...")

    with get_db() as conn:
        with conn.cursor() as cur:
            if engine == "postgres":
                # PostgreSQL DDL
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS accounts (
                        id VARCHAR(30) PRIMARY KEY,
                        holder_name VARCHAR(100) NOT NULL,
                        pan_or_ssn VARCHAR(20) NOT NULL,
                        risk_score INT DEFAULT 10,
                        status VARCHAR(20) DEFAULT 'ACTIVE',
                        is_pep BOOLEAN DEFAULT FALSE
                    );
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS transactions (
                        id VARCHAR(40) PRIMARY KEY,
                        source_account VARCHAR(30) REFERENCES accounts(id),
                        destination_account VARCHAR(30) REFERENCES accounts(id),
                        amount NUMERIC(12, 2) NOT NULL,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        currency VARCHAR(3) DEFAULT 'USD'
                    );
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS sar_reports (
                        id SERIAL PRIMARY KEY,
                        account_id VARCHAR(30) REFERENCES accounts(id),
                        reason TEXT NOT NULL,
                        filed_by VARCHAR(50) NOT NULL,
                        filed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
            else:
                # SQLite DDL
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS accounts (
                        id TEXT PRIMARY KEY,
                        holder_name TEXT NOT NULL,
                        pan_or_ssn TEXT NOT NULL,
                        risk_score INTEGER DEFAULT 10,
                        status TEXT DEFAULT 'ACTIVE',
                        is_pep BOOLEAN DEFAULT 0
                    );
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS transactions (
                        id TEXT PRIMARY KEY,
                        source_account TEXT REFERENCES accounts(id),
                        destination_account TEXT REFERENCES accounts(id),
                        amount REAL NOT NULL,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        currency TEXT DEFAULT 'USD'
                    );
                """)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS sar_reports (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        account_id TEXT REFERENCES accounts(id),
                        reason TEXT NOT NULL,
                        filed_by TEXT NOT NULL,
                        filed_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                """)

            # Check existing accounts count
            cur.execute("SELECT COUNT(*) as count FROM accounts;")
            res = cur.fetchone()
            count = res["count"] if res else 0

            # Re-seed if empty or upgrade if older seed (less than 10 accounts)
            if count < 11:
                print(f"[*] Seeding expanded enterprise dataset with mixed Clean and Fraud accounts...")
                # Clear previous seed for clean idempotent upgrade
                cur.execute("DELETE FROM sar_reports;")
                cur.execute("DELETE FROM transactions;")
                cur.execute("DELETE FROM accounts;")

                # 1. Accounts: 4 Fraud/PEP Originators & Sinks, 3 Shells/Mules, 4 Legitimate Clean Accounts
                accounts_data = [
                    # --- FRAUD SYNDICATE 1 (Split-and-Merge Smurfing) ---
                    ('ACC-KYC-001', 'Vladimir Vance', '4111-9821-4400-0091', 85, 'ACTIVE', 1),
                    ('ACC-SHELL-002', 'BlueHorizon Global Holdings', '9988-1234-9900-1122', 70, 'ACTIVE', 0),
                    ('ACC-SHELL-003', 'Apex Logistics Pte', '7733-5566-1188-4455', 65, 'ACTIVE', 0),
                    ('ACC-DEST-004', 'Elena Rostova (Syndicate Sink)', '5522-0099-3322-8877', 90, 'ACTIVE', 0),

                    # --- FRAUD SYNDICATE 2 (Offshore Crypto Layering) ---
                    ('ACC-FRAUD-009', 'Marcus Thorne', '3344-8822-1199-6677', 94, 'ACTIVE', 1),
                    ('ACC-MULE-010', 'Pacific Star Trading LLC', '7711-4433-2288-5599', 82, 'ACTIVE', 0),
                    ('ACC-DEST-011', 'Kowloon Digital Custody', '8844-0011-5566-3322', 96, 'ACTIVE', 0),

                    # --- MONEY MULE (Fan-In Smurfing) ---
                    ('ACC-MULE-012', 'Liam Brooks (Recruited Mule)', '6622-9911-3344-7788', 75, 'ACTIVE', 0),

                    # --- CLEAN RETAIL & COMMERCIAL ACCOUNTS ---
                    ('ACC-CLEAN-005', 'Jordan Smith (Freelancer)', '1234-7788-9900-5678', 5, 'ACTIVE', 0),
                    ('ACC-CLEAN-006', 'Sophia Chen (Software Engineer)', '2345-8899-0011-6789', 8, 'ACTIVE', 0),
                    ('ACC-CLEAN-007', 'Metro Realty Management', '3456-9900-1122-7890', 12, 'ACTIVE', 0),
                    ('ACC-CLEAN-008', 'David Miller (Contractor)', '4567-0011-2233-8901', 10, 'ACTIVE', 0),
                ]

                for acc in accounts_data:
                    cur.execute("""
                        INSERT INTO accounts (id, holder_name, pan_or_ssn, risk_score, status, is_pep)
                        VALUES (%s, %s, %s, %s, %s, %s);
                    """, acc)

                # 2. Transactions: Smurfing chains vs Clean everyday commerce
                transactions_data = [
                    # --- Syndicate 1: Multi-Hop Smurfing ($9k-$9.9k structuring) ---
                    ('TX-901', 'ACC-KYC-001', 'ACC-SHELL-002', 9800.00),
                    ('TX-902', 'ACC-KYC-001', 'ACC-SHELL-003', 9750.00),
                    ('TX-903', 'ACC-SHELL-002', 'ACC-DEST-004', 9600.00),
                    ('TX-904', 'ACC-SHELL-003', 'ACC-DEST-004', 9550.00),

                    # --- Syndicate 2: Rapid Structuring to Offshore Entity ---
                    ('TX-905', 'ACC-FRAUD-009', 'ACC-MULE-010', 9900.00),
                    ('TX-906', 'ACC-FRAUD-009', 'ACC-MULE-010', 9850.00),
                    ('TX-907', 'ACC-MULE-010', 'ACC-DEST-011', 9700.00),
                    ('TX-908', 'ACC-MULE-010', 'ACC-DEST-011', 9650.00),

                    # --- Syndicate 3: Direct Mule Injection into Elena Rostova ---
                    ('TX-909', 'ACC-MULE-012', 'ACC-DEST-004', 9920.00),

                    # --- Clean Economy: Rent, Salaries, Retail Transactions ---
                    ('TX-101', 'ACC-CLEAN-006', 'ACC-CLEAN-007', 2400.00),  # Rent payment
                    ('TX-102', 'ACC-CLEAN-006', 'ACC-CLEAN-008', 350.00),   # Home repairs
                    ('TX-103', 'ACC-CLEAN-007', 'ACC-CLEAN-008', 1250.00),  # Maintenance contract
                    ('TX-104', 'ACC-CLEAN-005', 'ACC-CLEAN-008', 120.00),   # Small invoice
                    ('TX-105', 'ACC-CLEAN-005', 'ACC-SHELL-002', 45.00),    # Incidental retail payment
                ]

                for tx in transactions_data:
                    cur.execute("""
                        INSERT INTO transactions (id, source_account, destination_account, amount)
                        VALUES (%s, %s, %s, %s);
                    """, tx)
        conn.commit()

    print(f"[OK] FinSecure [{engine.upper()}] schema and smurfing ledger seeded successfully.")

if __name__ == "__main__":
    init_and_seed_db()
