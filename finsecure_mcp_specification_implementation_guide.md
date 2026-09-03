# 🛡️ FinSecure-MCP: Autonomous Anti-Money Laundering & Graph Triage Engine

An enterprise-ready AI Engineering system demonstrating **Model Context Protocol (MCP)**, **Google Gemini 2.5 Flash**, **FastAPI**, **PostgreSQL**, and a **Next.js 16 (App Router)** interactive transaction topology war room.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Next.js 16 Operations Console                        │
│   - React 19.2 + Tailwind CSS + Lucide Icons                           │
│   - Interactive Node-Edge Multi-Hop Fund Graph (React Flow)            │
│   - Live Forensic Timeline & Challenge-Response HITL Authorization Box  │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ HTTP POST /api/investigate & /api/graph
┌──────────────────────────────────▼─────────────────────────────────────┐
│                    FastAPI AI Gateway (`api.py`)                       │
│   - Google GenAI SDK (`gemini-2.5-flash`)                              │
│   - Asynchronous Client Session Manager over Model Context Protocol    │
│   - Enforces Structured Response Invariants & State Normalization      │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ Stdio / Subprocess IPC (JSON-RPC)
┌──────────────────────────────────▼─────────────────────────────────────┐
│                   FinSecure FastMCP Server (`server.py`)               │
│                                                                        │
│   [MCP Resources]                                                      │
│   ├── `compliance://regulatory/thresholds` (FinCEN/SAR rules)          │
│   └── `account://audit-log/{account_id}` (Auto PII/PAN Redaction)      │
│                                                                        │
│   [MCP Tools (Read / Analytical)]                                      │
│   ├── `trace_transaction_hops(source_id, max_hops)` (Recursive SQL)   │
│   ├── `calculate_velocity_score(account_id)` (Smurfing detection)      │
│   └── `check_sanctions_and_pep(account_id)` (Registry check)           │
│                                                                        │
│   [MCP Tools (Destructive - Requires Cryptographic HITL Token)]        │
│   └── `freeze_account_and_file_sar(account_id, reason, token)`        │
│                                                                        │
│   [MCP Prompts]                                                        │
│   └── `audit_aml_smurfing_workflow(account_id)`                        │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ psycopg2 / RealDictCursor
┌──────────────────────────────────▼─────────────────────────────────────┐
│                      PostgreSQL 16 Database                            │
│   - `accounts`: KYC profiles, risk levels, and PEP flags               │
│   - `transactions`: Multi-hop financial ledger                         │
│   - `sar_reports`: Regulatory filing audit log                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```text
finsecure-mcp/
├── docker-compose.yml
├── backend/
│   ├── requirements.txt
│   ├── database.py
│   ├── server.py
│   └── api.py
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── postcss.config.mjs
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── globals.css
        │   └── page.tsx
        └── components/
            └── FlowVisualizer.tsx
```

---

## 🛠️ Step 1: Database Setup & Infrastructure

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: finsecure_db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
      POSTGRES_DB: finsecure_db
    ports:
      - "5432:5432"
    volumes:
      - finsecure_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d finsecure_db"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  finsecure_pgdata:
```

### `backend/database.py`

Creates relational schemas and seeds a multi-hop smurfing ledger with high-velocity, sub-$10,000 structuring transfers.

```python
import os
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgrespassword@localhost:5432/finsecure_db")

def get_db():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def init_and_seed_db():
    with get_db() as conn:
        with conn.cursor() as cur:
            # 1. Accounts Table
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

            # 2. Transactions Ledger
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

            # 3. Regulatory SAR Reports
            cur.execute("""
                CREATE TABLE IF NOT EXISTS sar_reports (
                    id SERIAL PRIMARY KEY,
                    account_id VARCHAR(30) REFERENCES accounts(id),
                    reason TEXT NOT NULL,
                    filed_by VARCHAR(50) NOT NULL,
                    filed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # Populate seed data if empty
            cur.execute("SELECT COUNT(*) FROM accounts;")
            if cur.fetchone()["count"] == 0:
                cur.execute("""
                    INSERT INTO accounts (id, holder_name, pan_or_ssn, risk_score, status, is_pep) VALUES
                    ('ACC-KYC-001', 'Vladimir Vance', '4111-9821-4400-0091', 85, 'ACTIVE', TRUE),
                    ('ACC-SHELL-002', 'BlueHorizon Global Holdings', '9988-1234-9900-1122', 70, 'ACTIVE', FALSE),
                    ('ACC-SHELL-003', 'Apex Logistics Pte', '7733-5566-1188-4455', 65, 'ACTIVE', FALSE),
                    ('ACC-DEST-004', 'Elena Rostova', '5522-0099-3322-8877', 90, 'ACTIVE', FALSE),
                    ('ACC-CLEAN-005', 'Jordan Smith', '1234-7788-9900-5678', 5, 'ACTIVE', FALSE);
                """)

                # Layered Smurfing Topology: ACC-KYC-001 splits into Shells, converging on ACC-DEST-004
                cur.execute("""
                    INSERT INTO transactions (id, source_account, destination_account, amount) VALUES
                    ('TX-901', 'ACC-KYC-001', 'ACC-SHELL-002', 9800.00),
                    ('TX-902', 'ACC-KYC-001', 'ACC-SHELL-003', 9750.00),
                    ('TX-903', 'ACC-SHELL-002', 'ACC-DEST-004', 9600.00),
                    ('TX-904', 'ACC-SHELL-003', 'ACC-DEST-004', 9550.00),
                    ('TX-905', 'ACC-CLEAN-005', 'ACC-SHELL-002', 45.00);
                """)
        conn.commit()
    print("✅ PostgreSQL FinSecure schema and smurfing ledger seeded successfully.")

if __name__ == "__main__":
    init_and_seed_db()
```

---

## 🐍 Step 2: Backend Implementation (FastMCP & FastAPI)

### `backend/requirements.txt`

```text
fastmcp>=0.1.0
google-genai>=0.2.0
fastapi>=0.115.0
uvicorn>=0.30.0
psycopg2-binary>=2.9.9
pydantic>=2.7.0
python-dotenv>=1.0.1
```

### `backend/server.py`

This standalone script executes as the **FastMCP Server**, exposing Resources (with automatic PAN/SSN masking), analytical Tools (deterministic recursive SQL hops), and mutating Tools gated by a cryptographic Human-in-the-Loop challenge token.

```python
import os
import re
import secrets
import psycopg2
from psycopg2.extras import RealDictCursor
from fastmcp import FastMCP
from database import get_db

mcp = FastMCP("FinSecure-AML-Engine")

# Ephemeral state for two-phase challenge-response tokens
PENDING_FREEZE_APPROVALS = {}

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
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM accounts WHERE id = %s", (account_id.upper(),))
            acc = cur.fetchone()
            if not acc:
                return f"Account '{account_id}' not found."

            # Dynamic PII Guardrail: Redact PAN completely before injecting into LLM context
            raw_pan = str(acc["pan_or_ssn"])
            masked_pan = re.sub(r"\d", "*", raw_pan)
            return (
                f"Account: {acc['id']} | Holder: {acc['holder_name']} | "
                f"Risk: {acc['risk_score']} | PEP: {acc['is_pep']} | "
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
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (sanitized_id, safe_hops))
            hops = cur.fetchall()
            return {"source": sanitized_id, "discovered_paths": [dict(h) for h in hops]}

@mcp.tool()
def calculate_velocity_score(account_id: str) -> dict:
    """Calculates velocity and detects structured smurfing (multiple transactions between $9,000 and $9,999)."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) as total_transfers, SUM(amount) as total_volume,
                       COUNT(CASE WHEN amount BETWEEN 9000 AND 9999 THEN 1 END) as structured_tx_count
                FROM transactions
                WHERE source_account = %s;
            """, (account_id.upper(),))
            res = cur.fetchone()
            
            is_structuring = res["structured_tx_count"] >= 2
            return {
                "account_id": account_id.upper(),
                "total_outbound_volume": float(res["total_volume"] or 0),
                "structured_sub_10k_transfers": res["structured_tx_count"],
                "structuring_flag": is_structuring
            }

@mcp.tool()
def check_sanctions_and_pep(account_id: str) -> dict:
    """Checks regulatory sanctions registries and Politically Exposed Person (PEP) indicators."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT is_pep, risk_score FROM accounts WHERE id = %s", (account_id.upper(),))
            acc = cur.fetchone()
            if not acc:
                return {"found": False}
            return {
                "account_id": account_id.upper(),
                "is_pep": acc["is_pep"],
                "base_risk_score": acc["risk_score"],
                "elevated_audit_required": acc["is_pep"] or acc["risk_score"] > 80
            }

# -------------------------------------------------------------
# 3. HIGH-STAKES MUTATION TOOL (HITL Protected)
# -------------------------------------------------------------

@mcp.tool()
def freeze_account_and_file_sar(account_id: str, justification: str, confirmation_token: str = "") -> str:
    """IRREVERSIBLE: Suspends target account and files an official SAR (Suspicious Activity Report).
    Requires a valid human compliance officer challenge token.
    """
    target = account_id.upper()

    # Challenge-Response Verification
    if not confirmation_token:
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
```

### `backend/api.py`

FastAPI AI Gateway communicating with Gemini 2.5 Flash via the Python GenAI SDK while maintaining a live FastMCP client session over stdio.

```python
import os
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastmcp import Client
from google import genai
from google.genai import types
from database import init_and_seed_db, get_db

app = FastAPI(title="FinSecure AI Gateway")

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
    action_token: str = ""

@app.get("/api/graph/{account_id}")
def get_graph_data(account_id: str):
    """Provides structured nodes and edges for React Flow visualization."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT source_account, destination_account, amount, id FROM transactions;")
            txs = cur.fetchall()
            cur.execute("SELECT id, holder_name, risk_score, status, is_pep FROM accounts;")
            accs = cur.fetchall()

    return {
        "accounts": [dict(a) for a in accs],
        "transactions": [dict(t) for t in txs]
    }

@app.post("/api/investigate")
async def run_investigation(req: InvestigationRequest):
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY environment variable not configured.")

    server_script = os.path.abspath(os.path.join(os.path.dirname(__file__), "server.py"))
    mcp_client = Client(server_script)
    gemini_client = genai.Client(api_key=gemini_key)

    user_query = f"Execute AML triage for target account {req.account_id}."
    if req.action_token:
        user_query += f" The compliance officer has approved the action with token: {req.action_token}."

    async with mcp_client:
        system_instruction = (
            "You are FinSecure-AI, an automated AML forensic examiner. "
            "You have direct access to banking ledgers via Model Context Protocol tools and resources. "
            "Perform rigorous step-by-step investigations: inspect compliance policies, trace multi-hop chains, "
            "and identify smurfing patterns. Surface clear findings before requesting account freeze execution."
        )

        response = await gemini_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_query,
            config=types.GenerateContentConfig(
                temperature=0.0,
                system_instruction=system_instruction,
                tools=[mcp_client.session]  # Native MCP Tool & Resource Injection
            ),
        )

        return {
            "account_id": req.account_id,
            "verdict": response.text,
            "status": "COMPLETED"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
```

---

## ⚛️ Step 3: Frontend Implementation (Next.js 16 App Router)

### `frontend/package.json`

```json
{
  "name": "finsecure-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "reactflow": "^11.11.4",
    "lucide-react": "^0.470.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.6.0",
    "tailwindcss": "^4.0.0"
  }
}
```

### `frontend/src/components/FlowVisualizer.tsx`

```tsx
"use client";

import React, { useMemo } from "react";
import ReactFlow, { Background, Controls, Node, Edge, MarkerType } from "reactflow";
import "reactflow/dist/style.css";

interface Transaction {
  source_account: string;
  destination_account: string;
  amount: number;
}

interface Account {
  id: string;
  holder_name: string;
  risk_score: number;
  status: string;
  is_pep: boolean;
}

export default function FlowVisualizer({
  accounts,
  transactions,
  highlightAccount,
}: {
  accounts: Account[];
  transactions: Transaction[];
  highlightAccount: string;
}) {
  const nodes: Node[] = useMemo(() => {
    const coords: Record<string, { x: number; y: number }> = {
      "ACC-KYC-001": { x: 40, y: 140 },
      "ACC-SHELL-002": { x: 300, y: 50 },
      "ACC-SHELL-003": { x: 300, y: 230 },
      "ACC-DEST-004": { x: 580, y: 140 },
      "ACC-CLEAN-005": { x: 40, y: 300 },
    };

    return accounts.map((acc) => {
      const pos = coords[acc.id] || { x: 100, y: 100 };
      const isTarget = acc.id === highlightAccount;
      return {
        id: acc.id,
        position: pos,
        data: {
          label: (
            <div className={`p-2.5 rounded-lg text-xs font-mono border transition-all ${
              acc.status === "FROZEN"
                ? "bg-rose-950/80 border-rose-500 text-rose-200 shadow-lg shadow-rose-950"
                : isTarget
                  ? "bg-amber-950/80 border-amber-500 text-amber-200 shadow-lg shadow-amber-950"
                  : "bg-slate-900 border-slate-700 text-slate-200"
            }`}>
              <div className="font-bold">{acc.id}</div>
              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{acc.holder_name}</div>
              <div className="flex justify-between mt-1 pt-1 border-t border-slate-800 text-[9px]">
                <span>Risk: {acc.risk_score}</span>
                {acc.is_pep && <span className="text-rose-400 font-bold ml-1">PEP</span>}
                <span className={`ml-1 font-bold ${acc.status === "FROZEN" ? "text-rose-400" : "text-emerald-400"}`}>
                  {acc.status}
                </span>
              </div>
            </div>
          ),
        },
      };
    });
  }, [accounts, highlightAccount]);

  const edges: Edge[] = useMemo(() => {
    return transactions.map((tx, idx) => {
      const isStructuring = Number(tx.amount) >= 9000 && Number(tx.amount) <= 9999;
      return {
        id: `e-${idx}`,
        source: tx.source_account,
        target: tx.destination_account,
        label: `$${Number(tx.amount).toLocaleString()}`,
        animated: isStructuring,
        style: {
          stroke: isStructuring ? "#f59e0b" : "#64748b",
          strokeWidth: isStructuring ? 2 : 1.2
        },
        labelStyle: { fill: isStructuring ? "#fbbf24" : "#cbd5e1", fontSize: 10, fontFamily: "monospace" },
        labelBgStyle: { fill: "#0f172a", fillOpacity: 0.9 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isStructuring ? "#f59e0b" : "#64748b"
        },
      };
    });
  }, [transactions]);

  return (
    <div className="w-full h-80 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background color="#1e293b" gap={16} />
        <Controls className="fill-slate-400" />
      </ReactFlow>
    </div>
  );
}
```

### `frontend/src/app/page.tsx`

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Search, Play, CheckCircle2, Lock, Unlock, AlertTriangle, RefreshCw } from "lucide-react";
import FlowVisualizer from "@/components/FlowVisualizer";

export default function ComplianceDashboard() {
  const [targetAccount, setTargetAccount] = useState("ACC-KYC-001");
  const [tokenInput, setTokenInput] = useState("");
  const [verdict, setVerdict] = useState("");
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState<{ accounts: any[]; transactions: any[] }>({
    accounts: [],
    transactions: [],
  });

  const loadGraph = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/graph/${targetAccount}`);
      const data = await res.json();
      setGraphData(data);
    } catch (e) {
      console.error("Failed to load graph ledger data", e);
    }
  };

  useEffect(() => {
    loadGraph();
  }, [targetAccount]);

  const triggerTriage = async (withToken: string = "") => {
    setLoading(true);
    setVerdict("");
    try {
      const res = await fetch("http://localhost:8000/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: targetAccount, action_token: withToken }),
      });
      const data = await res.json();
      setVerdict(data.verdict);
      await loadGraph();
    } catch (e) {
      setVerdict("Connection error to FinSecure AI Gateway.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      <header className="w-full max-w-6xl flex justify-between items-center pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-600/20 border border-amber-500/30 rounded-xl text-amber-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">FinSecure-MCP Operations Console</h1>
            <p className="text-xs text-slate-400">Autonomous AML Multi-Hop Triage & Protocol-Gated Actions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadGraph}
            className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-400 transition"
            title="Refresh Graph"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            MCP Protocol Active (Gemini 2.5 Flash)
          </div>
        </div>
      </header>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Column: Flow Graph & Controls */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-400" />
              <select
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                value={targetAccount}
                onChange={(e) => setTargetAccount(e.target.value)}
              >
                <option value="ACC-KYC-001">ACC-KYC-001 (Smurfing Origin & PEP)</option>
                <option value="ACC-CLEAN-005">ACC-CLEAN-005 (Legitimate Retail Account)</option>
                <option value="ACC-DEST-004">ACC-DEST-004 (Layered Sink Account)</option>
              </select>
            </div>
            <button
              onClick={() => triggerTriage()}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? "Agent Triaging..." : "Initiate AML Investigation"}</span>
            </button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-xs font-semibold text-slate-400">Live Multi-Hop Fund Topology</span>
              <span className="text-[10px] text-amber-400 font-mono">Animated Edges: Sub-$10k Structuring Transfers</span>
            </div>
            <FlowVisualizer
              accounts={graphData.accounts}
              transactions={graphData.transactions}
              highlightAccount={targetAccount}
            />
          </div>

          {/* Cryptographic Challenge Confirmation Console */}
          <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-2">
              <Lock className="w-4 h-4" />
              <span>Two-Phase Cryptographic HITL Approval Gate</span>
            </div>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Mutating operations (account freezes and regulatory SAR filings) are halted by the MCP Server until authorized by a compliance officer challenge token.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Challenge Token (e.g. SAR-XXXXXX)"
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs flex-1 font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
              <button
                onClick={() => triggerTriage(tokenInput)}
                disabled={loading || !tokenInput.trim()}
                className="bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Authorize & Execute Freeze</span>
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Forensic Log */}
        <section className="lg:col-span-5 bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex flex-col h-[560px]">
          <h2 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Agent Forensic Log & Regulatory SAR Draft</span>
          </h2>
          <div className="flex-1 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed shadow-inner">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500 animate-pulse">
                <CheckCircle2 className="w-6 h-6 text-amber-500 animate-spin" />
                <span>MCP Client executing tool calls over JSON-RPC...</span>
              </div>
            ) : verdict ? (
              verdict
            ) : (
              <span className="text-slate-600">Select an account and run triage to view MCP tool outputs.</span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
```

---

## 🚀 Execution & Setup Guide

### 1. Start PostgreSQL Container

```bash
docker compose up -d
```

Verify container status:
```bash
docker ps
```

### 2. Configure Backend & Seed Database

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt

export GEMINI_API_KEY="your-gemini-api-key-here"
export DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/finsecure_db"

# Seed the database and start the server
python database.py
python api.py
```

*API runs at `http://localhost:8000/docs`.*

### 3. Launch Next.js 16 Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open **`http://localhost:3000`** in your browser.

---

## 🎤 Interview Presentation Script & Technical Talking Points

When presenting this project to engineering managers and technical interviewers, frame your work around these three pillars:

### 1. Architectural Justification: "Why Model Context Protocol?"
> *"Standard tool-calling solutions hardcode function definitions directly inside application logic. By implementing Anthropic's open Model Context Protocol (MCP), I decoupled the diagnostic engine from the client. Any compliant client—Claude Desktop, Cursor, or my custom Next.js 16 portal via Google Gemini—can connect to the exact same enterprise compliance tools without code changes."*

### 2. Retrieval Strategy: "Why Vectorless Graph Traversal Over Embeddings?"
> *"Vector embeddings fail on relational ledgers because financial crimes like structuring and smurfing depend on topological paths, timestamp ordering, and exact math. I exposed recursive Common Table Expressions (CTEs) via an MCP tool, allowing Gemini 2.5 Flash to trace multi-hop shell accounts deterministically with zero hallucinations."*

### 3. Production Safety: "How Do You Secure Autonomous Mutations?"
> *"I implemented a two-phase challenge-response Human-in-the-Loop (HITL) gate. If the model determines that an account should be frozen, the MCP server intercepts the mutation, computes the blast radius, and emits an ephemeral challenge token (e.g., `SAR-A1B2C3`). The database write is blocked until a compliance officer provides that cryptographic token in the UI."*