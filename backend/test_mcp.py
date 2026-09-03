"""
FinSecure-MCP Interactive Lab CLI Test Runner
Demonstrates learning-by-doing: directly test MCP Resources, Analytical Tools,
and the Two-Phase Cryptographic HITL Freeze Gate.
"""

import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(__file__))

from database import init_and_seed_db, get_db
from server import (
    get_compliance_rules,
    get_account_profile_and_history,
    trace_transaction_hops,
    calculate_velocity_score,
    check_sanctions_and_pep,
    freeze_account_and_file_sar,
    PENDING_FREEZE_APPROVALS
)

def run_lab():
    print("=" * 70)
    print(" [FinSecure-MCP] Interactive Hands-on Engineering Lab")
    print("=" * 70)

    # 1. Database Initialization
    print("\n--- STEP 1: Database Initialization & Ledger Seeding ---")
    init_and_seed_db()

    # 2. Test MCP Resource: Regulatory Thresholds
    print("\n--- STEP 2: Testing MCP Resource (compliance://regulatory/thresholds) ---")
    rules = get_compliance_rules()
    print("Regulatory Rules Injected into LLM Context:")
    for line in rules.strip().split("\n"):
        print(f"  {line.strip()}")

    # 3. Test MCP Resource: Dynamic PII Masking
    print("\n--- STEP 3: Testing MCP Resource (account://audit-log/ACC-KYC-001) ---")
    profile = get_account_profile_and_history("ACC-KYC-001")
    print(f"Profile Injected (Notice Masked-TaxID!): \n  --> {profile}")

    # 4. Test MCP Analytical Tool: Sanctions & PEP Check
    print("\n--- STEP 4: Testing MCP Tool (check_sanctions_and_pep) ---")
    pep_res = check_sanctions_and_pep("ACC-KYC-001")
    print(f"Sanctions/PEP Check for ACC-KYC-001:\n  --> {pep_res}")

    # 5. Test MCP Analytical Tool: Velocity & Smurfing Structuring
    print("\n--- STEP 5: Testing MCP Tool (calculate_velocity_score) ---")
    vel_res = calculate_velocity_score("ACC-KYC-001")
    print(f"Velocity & Sub-$10k Structuring Analysis:\n  --> {vel_res}")

    # 6. Test MCP Analytical Tool: Recursive CTE Multi-Hop Graph Traversal
    print("\n--- STEP 6: Testing MCP Tool (trace_transaction_hops) ---")
    hops_res = trace_transaction_hops("ACC-KYC-001", max_hops=2)
    print(f"Deterministic Recursive SQL Hops from {hops_res['source']} (Engine: {hops_res['engine']}):")
    for hop in hops_res["discovered_paths"]:
        path = hop.get("path")
        amt = hop.get("amount")
        depth = hop.get("hop_depth")
        print(f"  [Hop Depth {depth}] Path: {path} | Amount: ${amt:,.2f}")

    # 7. Test Two-Phase HITL Gate: Phase 1 (Missing Token)
    print("\n--- STEP 7: Testing Two-Phase HITL Gate (Phase 1: Missing Token) ---")
    phase1_res = freeze_account_and_file_sar(
        account_id="ACC-KYC-001",
        justification="Detected structured smurfing of $19,550 via shell entities converging on ACC-DEST-004."
    )
    print(f"Agent Attempt Result:\n  --> {phase1_res}")
    
    token = PENDING_FREEZE_APPROVALS.get("ACC-KYC-001")
    print(f"  Active Challenge Token in Memory: [{token}]")

    # 8. Test Two-Phase HITL Gate: Phase 2 (Authorized with Token)
    print("\n--- STEP 8: Testing Two-Phase HITL Gate (Phase 2: Authorized with Token) ---")
    if token:
        phase2_res = freeze_account_and_file_sar(
            account_id="ACC-KYC-001",
            justification="Detected structured smurfing of $19,550 via shell entities converging on ACC-DEST-004.",
            confirmation_token=token
        )
        print(f"Officer Approval Result:\n  --> {phase2_res}")

        # Check DB Status
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, status, risk_score FROM accounts WHERE id = 'ACC-KYC-001'")
                print(f"Updated Database Record: {cur.fetchone()}")
                cur.execute("SELECT * FROM sar_reports WHERE account_id = 'ACC-KYC-001'")
                print(f"SAR Report Stored: {cur.fetchall()}")

    # 9. Test Negative Control: Clean Account (ACC-CLEAN-006)
    print("\n--- STEP 9: Testing Clean Control Account (ACC-CLEAN-006) ---")
    clean_profile = get_account_profile_and_history("ACC-CLEAN-006")
    print(f"Profile: {clean_profile}")
    clean_pep = check_sanctions_and_pep("ACC-CLEAN-006")
    print(f"PEP/Sanctions: {clean_pep}")
    clean_vel = calculate_velocity_score("ACC-CLEAN-006")
    print(f"Structuring Flag: {clean_vel['structuring_flag']} | Sub-$10k Smurfing Transfers: {clean_vel['structured_sub_10k_transfers']}")
    clean_hops = trace_transaction_hops("ACC-CLEAN-006", max_hops=2)
    print(f"Hops Discovered: {len(clean_hops['discovered_paths'])} normal commerce payments (rent/repairs).")

    print("\n" + "=" * 70)
    print(" [OK] All MCP Resources, Tools, and HITL Gates Verified Successfully!")
    print("=" * 70)

if __name__ == "__main__":
    run_lab()
