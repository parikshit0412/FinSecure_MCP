import os
import sys
import re
import secrets
from typing import Dict, Any

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastmcp import FastMCP
from database import get_db, get_db_engine

mcp = FastMCP("FinSecure-AML-Engine")

# Ephemeral state for two-phase challenge-response tokens
PENDING_FREEZE_APPROVALS: Dict[str, str] = {}

# -------------------------------------------------------------
# 1. MCP RESOURCES
# -------------------------------------------------------------

@mcp.resource("compliance://regulatory/thresholds")
def get_compliance_rules() -> str:
    """Returns statutory FinCEN and AML compliance thresholds."""
    return """
    STATUTORY AML REGULATORY MATRIX:
    - Structuring / Smurfing: Multiple rapid transfers between $9,000 and $9,999 structured to bypass the $10,000 Currency Transaction Report (CTR) filing rule.
    - PEP Exposure: Any Politically Exposed Person initiating outbound high-velocity funds must be flagged for SAR.
    - Graph Smurfing: Multiple intermediary accounts receiving funds that converge on a single sink account within 48 hours requires immediate suspension.
    - Account Freeze: Irreversible mutation. Requires compliance officer cryptographic token.
    """

@mcp.resource("account://audit-log/{account_id}")
def get_account_profile_and_history(account_id: str) -> str:
    """Reads account profile with dynamic PAN/SSN de-identification."""
    sanitized_id = account_id.strip().upper()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM accounts WHERE id = %s", (sanitized_id,))
            acc = cur.fetchone()
            if not acc:
                return f"Account '{sanitized_id}' not found."

            # Dynamic PII Guardrail: Redact PAN completely before injecting into LLM context
            raw_pan = str(acc["pan_or_ssn"])
            masked_pan = re.sub(r"\d", "*", raw_pan)
            is_pep = bool(acc["is_pep"])
            return (
                f"Account: {acc['id']} | Holder: {acc['holder_name']} | "
                f"Risk: {acc['risk_score']} | PEP: {is_pep} | "
                f"Status: {acc['status']} | Masked-TaxID: {masked_pan}"
            )

# -------------------------------------------------------------
# 2. MCP TOOLS (Analytical & Graph Operations)
# -------------------------------------------------------------

@mcp.tool()
def trace_transaction_hops(source_account: str, max_hops: int = 2) -> dict:
    """Deterministic graph traversal identifying layered funds routing across intermediary accounts."""
    sanitized_id = source_account.strip().upper()
    safe_hops = min(max(1, max_hops), 3)
    engine = get_db_engine()

    if engine == "postgres":
        query = """
            WITH RECURSIVE fund_graph AS (
                SELECT 
                    t.source_account, 
                    t.destination_account, 
                    t.amount, 
                    1 AS hop_depth,
                    ARRAY[t.source_account, t.destination_account] AS path
                FROM transactions t
                WHERE t.source_account = %s

                UNION ALL

                SELECT 
                    t2.source_account, 
                    t2.destination_account, 
                    t2.amount, 
                    fg.hop_depth + 1,
                    fg.path || t2.destination_account
                FROM transactions t2
                INNER JOIN fund_graph fg ON t2.source_account = fg.destination_account
                WHERE fg.hop_depth < %s AND NOT (t2.destination_account = ANY(fg.path))
            )
            SELECT * FROM fund_graph ORDER BY hop_depth ASC;
        """
        params = (sanitized_id, safe_hops)
    else:
        # SQLite recursive CTE with delimiter-based path cycle prevention
        query = """
            WITH RECURSIVE fund_graph AS (
                SELECT 
                    t.source_account, 
                    t.destination_account, 
                    t.amount, 
                    1 AS hop_depth,
                    t.source_account || '->' || t.destination_account AS path
                FROM transactions t
                WHERE t.source_account = %s

                UNION ALL

                SELECT 
                    t2.source_account, 
                    t2.destination_account, 
                    t2.amount, 
                    fg.hop_depth + 1,
                    fg.path || '->' || t2.destination_account
                FROM transactions t2
                INNER JOIN fund_graph fg ON t2.source_account = fg.destination_account
                WHERE fg.hop_depth < %s AND INSTR(fg.path, t2.destination_account) = 0
            )
            SELECT * FROM fund_graph ORDER BY hop_depth ASC;
        """
        params = (sanitized_id, safe_hops)

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            hops = cur.fetchall()
            return {
                "source": sanitized_id,
                "engine": engine,
                "discovered_paths": [dict(h) for h in hops]
            }

@mcp.tool()
def calculate_velocity_score(account_id: str) -> dict:
    """Calculates velocity and detects structured smurfing (multiple transactions between $9,000 and $9,999)."""
    sanitized_id = account_id.strip().upper()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) as total_transfers, SUM(amount) as total_volume,
                       COUNT(CASE WHEN amount BETWEEN 9000 AND 9999 THEN 1 END) as structured_tx_count
                FROM transactions
                WHERE source_account = %s;
            """, (sanitized_id,))
            res = cur.fetchone() or {"total_transfers": 0, "total_volume": 0, "structured_tx_count": 0}
            
            structured_count = int(res["structured_tx_count"] or 0)
            is_structuring = structured_count >= 2
            return {
                "account_id": sanitized_id,
                "total_outbound_volume": float(res["total_volume"] or 0),
                "structured_sub_10k_transfers": structured_count,
                "structuring_flag": is_structuring
            }

@mcp.tool()
def check_sanctions_and_pep(account_id: str) -> dict:
    """Checks regulatory sanctions registries and Politically Exposed Person (PEP) indicators."""
    sanitized_id = account_id.strip().upper()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT is_pep, risk_score FROM accounts WHERE id = %s", (sanitized_id,))
            acc = cur.fetchone()
            if not acc:
                return {"found": False, "account_id": sanitized_id}
            is_pep = bool(acc["is_pep"])
            risk_score = int(acc["risk_score"] or 0)
            return {
                "found": True,
                "account_id": sanitized_id,
                "is_pep": is_pep,
                "base_risk_score": risk_score,
                "elevated_audit_required": is_pep or risk_score > 80
            }

# -------------------------------------------------------------
# 3. HIGH-STAKES MUTATION TOOL (HITL Protected)
# -------------------------------------------------------------

@mcp.tool()
def freeze_account_and_file_sar(account_id: str, justification: str, confirmation_token: str = "") -> str:
    """IRREVERSIBLE: Suspends target account and files an official SAR (Suspicious Activity Report).
    Requires a valid human compliance officer challenge token.
    """
    target = account_id.strip().upper()

    # Challenge-Response Verification
    if not confirmation_token or not confirmation_token.strip():
        challenge = f"SAR-{secrets.token_hex(3).upper()}"
        PENDING_FREEZE_APPROVALS[target] = challenge
        return (
            f"ACTION_HALTED_HITL_REQUIRED: Account freeze is an irreversible regulatory event. "
            f"Blast radius: Target account {target} will be suspended immediately. "
            f"Challenge Token Generated: [{challenge}]. "
            f"Surface this token in the compliance dashboard for officer approval."
        )

    stored_token = PENDING_FREEZE_APPROVALS.get(target)
    if not stored_token or stored_token != confirmation_token.strip():
        return f"REJECTED: Invalid or expired confirmation token for account {target}."

    # Execute atomic write
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE accounts SET status = 'FROZEN', risk_score = 100 WHERE id = %s", (target,))
            cur.execute(
                "INSERT INTO sar_reports (account_id, reason, filed_by) VALUES (%s, %s, %s)",
                (target, justification, "AI-Agent-Supervised")
            )
            conn.commit()
            del PENDING_FREEZE_APPROVALS[target]

    return f"SUCCESS: Account {target} has been FROZEN. Suspicious Activity Report filed successfully."

# -------------------------------------------------------------
# 4. MCP PROMPTS
# -------------------------------------------------------------

@mcp.prompt()
def audit_aml_smurfing_workflow(account_id: str) -> str:
    """Standardized multi-step operational workflow for AML triage."""
    return f"""
    You are an expert Anti-Money Laundering (AML) Forensic Compliance Agent.
    Investigate target account {account_id}:
    1. Read 'compliance://regulatory/thresholds' to review smurfing parameters.
    2. Read 'account://audit-log/{account_id}' for risk profile and PEP status.
    3. Call 'trace_transaction_hops' to discover destination fan-outs or converging intermediary shells.
    4. Call 'calculate_velocity_score' to verify sub-$10,000 structuring patterns.
    5. If smurfing or PEP structuring is confirmed: call 'freeze_account_and_file_sar'.
    6. If halted by HITL, state your findings and instruct the compliance officer to sign off with the challenge token.
    """

if __name__ == "__main__":
    mcp.run()
