import os
import sys
import asyncio
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Ensure backend directory is in sys.path regardless of execution working directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

from database import init_and_seed_db, get_db, get_db_engine
from server import (
    get_compliance_rules,
    get_account_profile_and_history,
    trace_transaction_hops,
    calculate_velocity_score,
    check_sanctions_and_pep,
    freeze_account_and_file_sar,
    PENDING_FREEZE_APPROVALS
)

app = FastAPI(
    title="FinSecure AI Gateway",
    description="Autonomous AML Forensic Triage Gateway with Model Context Protocol & Google Gemini"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_and_seed_db()

class InvestigationRequest(BaseModel):
    account_id: str
    action_token: Optional[str] = ""

class TransactionCreate(BaseModel):
    source_account: str
    destination_account: str
    amount: float

class AccountCreate(BaseModel):
    id: str
    holder_name: str
    risk_score: int = 10
    is_pep: bool = False
    pan_or_ssn: Optional[str] = "4111-0000-0000-1234"

@app.get("/api/health")
def get_health():
    engine = get_db_engine()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as count FROM accounts;")
            acc_count = cur.fetchone()["count"]
            cur.execute("SELECT COUNT(*) as count FROM transactions;")
            tx_count = cur.fetchone()["count"]
    return {
        "status": "HEALTHY",
        "database_engine": engine,
        "accounts_count": acc_count,
        "transactions_count": tx_count,
        "gemini_api_configured": bool(gemini_key)
    }

@app.post("/api/transactions")
def create_transaction(tx: TransactionCreate):
    """Dynamically injects a new transaction into the financial ledger."""
    src = tx.source_account.strip().upper()
    dest = tx.destination_account.strip().upper()
    if src == dest:
        raise HTTPException(status_code=400, detail="Source and destination cannot be the same account.")

    import uuid
    tx_id = f"TX-{uuid.uuid4().hex[:6].upper()}"

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM accounts WHERE id = %s;", (src,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail=f"Source account {src} does not exist.")
            cur.execute("SELECT id FROM accounts WHERE id = %s;", (dest,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail=f"Destination account {dest} does not exist.")

            cur.execute("""
                INSERT INTO transactions (id, source_account, destination_account, amount)
                VALUES (%s, %s, %s, %s);
            """, (tx_id, src, dest, tx.amount))
            conn.commit()

    return {
        "status": "CREATED",
        "transaction_id": tx_id,
        "source": src,
        "destination": dest,
        "amount": tx.amount
    }

@app.get("/api/transactions")
def list_transactions():
    """Returns all transactions from the ledger database."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, source_account, destination_account, amount, currency, timestamp FROM transactions ORDER BY id ASC;")
            return {"transactions": cur.fetchall() or []}

@app.get("/api/accounts")
def list_accounts():
    """Returns all accounts from the ledger database."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, holder_name, risk_score, status, is_pep FROM accounts ORDER BY id ASC;")
            return {"accounts": cur.fetchall() or []}

@app.get("/api/accounts/{account_id}")
def get_account_detail(account_id: str):
    """Returns profile and KYC status for a specific account."""
    target = account_id.strip().upper()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, holder_name, risk_score, status, is_pep FROM accounts WHERE id = %s;", (target,))
            acc = cur.fetchone()
            if not acc:
                raise HTTPException(status_code=404, detail=f"Account {target} not found.")
            return {"account": acc}

@app.post("/api/accounts")
def create_account(acc: AccountCreate):
    """Creates a new KYC account in the database."""
    acc_id = acc.id.strip().upper()
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM accounts WHERE id = %s;", (acc_id,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail=f"Account {acc_id} already exists.")

            cur.execute("""
                INSERT INTO accounts (id, holder_name, pan_or_ssn, risk_score, status, is_pep)
                VALUES (%s, %s, %s, %s, 'ACTIVE', %s);
            """, (acc_id, acc.holder_name, acc.pan_or_ssn, acc.risk_score, 1 if acc.is_pep else 0))
            conn.commit()

    return {"status": "CREATED", "account_id": acc_id}

class OfficerActionRequest(BaseModel):
    account_id: str
    action: str  # "FREEZE", "UNFREEZE", "FILE_SAR", "ADJUST_RISK"
    justification: Optional[str] = "Manual Compliance Officer Intervention"
    new_risk_score: Optional[int] = None
    is_pep: Optional[bool] = None

@app.post("/api/officer/action")
def officer_direct_action(req: OfficerActionRequest):
    """Allows a human compliance officer to take direct administrative actions:
    emergency freeze, unfreeze/restore, direct SAR filing, or risk adjustments.
    """
    target = req.account_id.strip().upper()
    action = req.action.strip().upper()

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, status, risk_score, holder_name FROM accounts WHERE id = %s", (target,))
            acc = cur.fetchone()
            if not acc:
                raise HTTPException(status_code=404, detail=f"Account {target} not found.")

            if action == "FREEZE":
                cur.execute("UPDATE accounts SET status = 'FROZEN', risk_score = 100 WHERE id = %s", (target,))
                cur.execute(
                    "INSERT INTO sar_reports (account_id, reason, filed_by) VALUES (%s, %s, %s)",
                    (target, req.justification or "Direct Emergency Freeze by Human Compliance Officer", "Human-Compliance-Officer")
                )
                conn.commit()
                return {
                    "status": "SUCCESS",
                    "action": "FROZEN",
                    "account_id": target,
                    "message": f"Account {target} ({acc['holder_name']}) has been FROZEN and SAR filed by Human Compliance Officer."
                }

            elif action == "UNFREEZE":
                new_score = req.new_risk_score if req.new_risk_score is not None else 20
                cur.execute("UPDATE accounts SET status = 'ACTIVE', risk_score = %s WHERE id = %s", (new_score, target))
                conn.commit()
                return {
                    "status": "SUCCESS",
                    "action": "UNFROZEN",
                    "account_id": target,
                    "message": f"Account {target} has been UNFROZEN and restored to ACTIVE status with risk score {new_score}."
                }

            elif action == "FILE_SAR":
                cur.execute(
                    "INSERT INTO sar_reports (account_id, reason, filed_by) VALUES (%s, %s, %s)",
                    (target, req.justification or "Manual Regulatory Filing", "Human-Compliance-Officer")
                )
                conn.commit()
                return {
                    "status": "SUCCESS",
                    "action": "SAR_FILED",
                    "account_id": target,
                    "message": f"Official Suspicious Activity Report filed for account {target}."
                }

            elif action == "CASCADE_FREEZE":
                # Find all downstream shell and sink accounts connected to this target
                hops_data = trace_transaction_hops(target, max_hops=3)
                downstream = [h["destination_account"] for h in hops_data.get("discovered_paths", [])]
                all_targets = list(dict.fromkeys([target] + downstream))

                reason_text = req.justification or f"Full-Chain Syndicate Blast-Radius Freeze triggered from origin {target}."
                for acc_id in all_targets:
                    cur.execute("UPDATE accounts SET status = 'FROZEN', risk_score = 100 WHERE id = %s", (acc_id,))
                    cur.execute(
                        "INSERT INTO sar_reports (account_id, reason, filed_by) VALUES (%s, %s, %s)",
                        (acc_id, f"[CASCADE-FREEZE] {reason_text}", "Human-Compliance-Officer-Cascade")
                    )
                conn.commit()
                return {
                    "status": "SUCCESS",
                    "action": "CASCADE_FROZEN",
                    "account_id": target,
                    "affected_accounts": all_targets,
                    "message": f"Full Syndicate Cascade Freeze executed! {len(all_targets)} accounts suspended: {', '.join(all_targets)}."
                }

            elif action == "ADJUST_RISK":
                score = req.new_risk_score if req.new_risk_score is not None else acc["risk_score"]
                if req.is_pep is not None:
                    cur.execute("UPDATE accounts SET risk_score = %s, is_pep = %s WHERE id = %s", (score, 1 if req.is_pep else 0, target))
                else:
                    cur.execute("UPDATE accounts SET risk_score = %s WHERE id = %s", (score, target))
                conn.commit()
                return {
                    "status": "SUCCESS",
                    "action": "RISK_UPDATED",
                    "account_id": target,
                    "new_risk_score": score
                }

            else:
                raise HTTPException(status_code=400, detail=f"Unknown officer action: {action}")

@app.get("/api/sar-reports")
def get_sar_reports():
    """Returns all filed regulatory SAR reports."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT s.id, s.account_id, a.holder_name, s.reason, s.filed_by, s.filed_at
                FROM sar_reports s
                LEFT JOIN accounts a ON s.account_id = a.id
                ORDER BY s.id DESC;
            """)
            return {"reports": cur.fetchall()}

@app.post("/api/reset-db")
def reset_database():
    """Resets the database ledger back to initial demo state."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM sar_reports;")
            cur.execute("DELETE FROM transactions;")
            cur.execute("DELETE FROM accounts;")
            conn.commit()
    # Re-seed
    init_and_seed_db()
    return {"status": "RESET_COMPLETED"}

@app.get("/api/graph")
@app.get("/api/graph/{account_id}")
def get_graph_data(account_id: str = "ACC-KYC-001"):
    """Provides structured nodes and edges for React Flow visualization."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, source_account, destination_account, amount, currency, timestamp FROM transactions;")
            txs = cur.fetchall() or []
            cur.execute("SELECT id, holder_name, risk_score, status, is_pep FROM accounts;")
            accs = cur.fetchall() or []

    return {
        "target_account": account_id.upper() if account_id else "ACC-KYC-001",
        "accounts": [dict(a) for a in accs],
        "transactions": [dict(t) for t in txs]
    }

async def run_simulated_triage(account_id: str, action_token: str) -> str:
    """Educational Agent Simulation: Executes actual MCP tools deterministically
    to simulate the Gemini 2.5 Flash ReAct loop when GEMINI_API_KEY is not configured.
    """
    acc_id = account_id.strip().upper()
    lines = []
    lines.append(f"[MCP CLIENT SESSION INITIALIZED] Target Account: {acc_id}")
    lines.append("=" * 60)

    # Step 1: Read Compliance Matrix Resource
    lines.append("\n[STEP 1: INSPECTING MCP RESOURCE] compliance://regulatory/thresholds")
    rules = get_compliance_rules()
    lines.append("  Rule Check: FinCEN sub-$10k smurfing & PEP high-velocity outbound policies loaded.")

    # Step 2: Read Account Profile Resource
    lines.append(f"\n[STEP 2: INSPECTING MCP RESOURCE] account://audit-log/{acc_id}")
    profile = get_account_profile_and_history(acc_id)
    lines.append(f"  {profile}")

    # Step 3: Call Analytical Tool: check_sanctions_and_pep
    lines.append(f"\n[STEP 3: CALLING MCP TOOL] check_sanctions_and_pep(account_id='{acc_id}')")
    pep_info = check_sanctions_and_pep(acc_id)
    lines.append(f"  PEP Status: {pep_info.get('is_pep')} | Base Risk Score: {pep_info.get('base_risk_score')}")

    # Step 4: Call Analytical Tool: calculate_velocity_score
    lines.append(f"\n[STEP 4: CALLING MCP TOOL] calculate_velocity_score(account_id='{acc_id}')")
    vel = calculate_velocity_score(acc_id)
    lines.append(f"  Structuring Flag: {vel.get('structuring_flag')} | Structured Transfers: {vel.get('structured_sub_10k_transfers')} | Total Volume: ${vel.get('total_outbound_volume'):,.2f}")

    # Step 5: Call Analytical Tool: trace_transaction_hops
    lines.append(f"\n[STEP 5: CALLING MCP TOOL] trace_transaction_hops(source_account='{acc_id}', max_hops=2)")
    hops = trace_transaction_hops(acc_id, max_hops=2)
    discovered = hops.get("discovered_paths", [])
    if discovered:
        for h in discovered:
            lines.append(f"  --> Depth {h.get('hop_depth')}: {h.get('path')} (${h.get('amount'):,.2f})")
    else:
        lines.append("  No outbound multi-hop transactions discovered.")

    # Step 6: Synthesis & HITL Decision Gate
    lines.append("\n" + "=" * 60)
    lines.append("FORENSIC VERDICT & REGULATORY SAR DRAFT:")

    if vel.get("structuring_flag") or pep_info.get("elevated_audit_required"):
        lines.append("ALERT: High-confidence layered smurfing topology identified.")
        lines.append("Suspicious Pattern: Rapid split outbound transfers structured just below the $10,000 CTR threshold,")
        lines.append("flowing through intermediary corporate shell entities and converging on a unified destination sink.")

        justification = (
            f"Automated AML triage detected structured smurfing of ${vel.get('total_outbound_volume'):,.2f} "
            f"across {vel.get('structured_sub_10k_transfers')} sub-$10k transfers routed via intermediary shells."
        )

        lines.append(f"\n[STEP 6: CALLING MCP TOOL] freeze_account_and_file_sar(account_id='{acc_id}', confirmation_token='{action_token}')")
        mutation_result = freeze_account_and_file_sar(acc_id, justification, confirmation_token=action_token)
        lines.append(f"\n{mutation_result}")
    else:
        lines.append("CLEARED: No illicit structuring or multi-hop smurfing patterns detected.")
        lines.append("Transaction volumes fall within normal retail variance with no sanctions or PEP alerts.")

    return "\n".join(lines)

@app.post("/api/investigate")
async def run_investigation(req: InvestigationRequest):
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if gemini_key:
        try:
            from google import genai
            from google.genai import types

            gemini_client = genai.Client(api_key=gemini_key)
            user_query = f"Execute AML triage for target account {req.account_id}."
            if req.action_token:
                user_query += f" The compliance officer has approved the action with confirmation token: {req.action_token}."

            system_instruction = (
                "You are FinSecure-AI, an automated AML forensic examiner. "
                "You have direct access to banking ledgers via Model Context Protocol tools and resources. "
                "Perform rigorous step-by-step investigations: inspect compliance policies, trace multi-hop chains, "
                "and identify smurfing patterns. Surface clear findings before requesting account freeze execution."
            )

            # Pass functions directly as native callable tools to Gemini
            tools_list = [
                get_compliance_rules,
                get_account_profile_and_history,
                trace_transaction_hops,
                calculate_velocity_score,
                check_sanctions_and_pep,
                freeze_account_and_file_sar,
            ]

            response = await asyncio.to_thread(
                gemini_client.models.generate_content,
                model="gemini-2.5-flash",
                contents=user_query,
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    system_instruction=system_instruction,
                    tools=tools_list,
                ),
            )

            token_after = PENDING_FREEZE_APPROVALS.get(req.account_id.strip().upper(), "")
            return {
                "account_id": req.account_id,
                "verdict": response.text,
                "status": "COMPLETED",
                "mode": "GEMINI_2_5_FLASH",
                "challenge_token": token_after
            }
        except Exception as e:
            # Fallback to deterministic execution with error annotation
            sim_output = await run_simulated_triage(req.account_id, req.action_token or "")
            token_after = PENDING_FREEZE_APPROVALS.get(req.account_id.strip().upper(), "")
            return {
                "account_id": req.account_id,
                "verdict": f"[Gemini Notice: {str(e)}]\n\n{sim_output}",
                "status": "COMPLETED",
                "mode": "FALLBACK_SIMULATOR",
                "challenge_token": token_after
            }
    else:
        # Zero-API-Key Learning Mode
        sim_output = await run_simulated_triage(req.account_id, req.action_token or "")
        token_after = PENDING_FREEZE_APPROVALS.get(req.account_id.strip().upper(), "")
        return {
            "account_id": req.account_id,
            "verdict": sim_output,
            "status": "COMPLETED",
            "mode": "LEARNING_SIMULATOR",
            "challenge_token": token_after
        }

@app.get("/api/pending-token/{account_id}")
def get_pending_token(account_id: str):
    sanitized = account_id.strip().upper()
    return {
        "account_id": sanitized,
        "challenge_token": PENDING_FREEZE_APPROVALS.get(sanitized, "")
    }

# -------------------------------------------------------------
# Static Frontend Serving (Unified Single-Container Production)
# -------------------------------------------------------------
from fastapi.staticfiles import StaticFiles

frontend_out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "out")
if os.path.isdir(frontend_out_dir):
    app.mount("/", StaticFiles(directory=frontend_out_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)

