# 🎓 FinSecure-MCP: Learn-by-Doing Forensic Engineering Guide

Welcome to **FinSecure-MCP**! This repository is designed for hands-on learning of modern agentic AI architecture, specifically:
- **Model Context Protocol (MCP)** for decoupling compliance tools from AI clients.
- **Deterministic Recursive SQL (CTEs)** over relational ledgers vs brittle vector embeddings.
- **Two-Phase Cryptographic Human-in-the-Loop (HITL)** gates for high-stakes actions.
- **Google Gemini 2.5 Flash** tool execution.
- **Next.js & React Flow** for cyber-forensic graph topology visualization.

---

## 🧭 System Architecture & Concept Primer

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Next.js Operations War Room                          │
│   - Interactive Node-Edge Multi-Hop Fund Graph (React Flow)            │
│   - Live Forensic Timeline & Challenge-Response HITL Authorization Box │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ HTTP POST /api/investigate & /api/graph
┌──────────────────────────────────▼─────────────────────────────────────┐
│                    FastAPI AI Gateway (`backend/api.py`)               │
│   - Google GenAI SDK (`gemini-2.5-flash`)                              │
│   - Zero-key Simulation fallback for immediate offline learning        │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ Stdio / IPC / Native Callables
┌──────────────────────────────────▼─────────────────────────────────────┐
│                   FinSecure FastMCP Server (`backend/server.py`)       │
│                                                                        │
│   [MCP Resources]                                                      │
│   ├── `compliance://regulatory/thresholds` (FinCEN matrix)             │
│   └── `account://audit-log/{account_id}` (Automatic PAN masking)       │
│                                                                        │
│   [MCP Analytical Tools]                                               │
│   ├── `trace_transaction_hops` (Recursive CTE SQL multi-hop)           │
│   ├── `calculate_velocity_score` (Sub-$10k structuring detection)      │
│   └── `check_sanctions_and_pep` (Politically Exposed Person registry)  │
│                                                                        │
│   [MCP Mutating Tool (HITL Gated)]                                     │
│   └── `freeze_account_and_file_sar` (Halts until challenge token)      │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ psycopg2 or SQLite Fallback
┌──────────────────────────────────▼─────────────────────────────────────┐
│                   PostgreSQL 16 / SQLite Engine                        │
│   - `accounts`: KYC profiles, risk levels, and PEP flags               │
│   - `transactions`: Multi-hop financial ledger                         │
│   - `sar_reports`: Regulatory filing audit log                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🧪 Hands-on Lab Curriculum (5 Exercises)

### Exercise 1: Terminal Triage with the Interactive MCP Lab Runner
Before touching the web UI, verify how each MCP component functions in isolation:

```powershell
# In project root:
backend\venv\Scripts\python backend/test_mcp.py
```

**What to observe in the output:**
1. **Dynamic PII Masking**: Notice how `account://audit-log/ACC-KYC-001` converts PAN `4111-9821-4400-0091` to `****-****-****-****` before LLM injection.
2. **Recursive SQL Traversal**: Notice the 2 hops:
   - Hop 1: `ACC-KYC-001` -> `ACC-SHELL-002` ($9,800)
   - Hop 2: `ACC-SHELL-002` -> `ACC-DEST-004` ($9,600)
3. **Two-Phase HITL Gate**: Notice the first attempt without a token generates `[SAR-XXXXXX]`. Only the second invocation with that exact token succeeds in updating the database.

---

### Exercise 2: Start the FastAPI AI Gateway
Launch the backend server:

```powershell
backend\venv\Scripts\uvicorn backend.api:app --reload --port 8000
```

1. Open your browser to **`http://localhost:8000/docs`** (FastAPI Swagger UI).
2. Test `GET /api/health` to confirm the database engine (`sqlite` or `postgres`).
3. Test `GET /api/graph/ACC-KYC-001` to view the raw node/edge JSON.
4. Execute `POST /api/investigate` with:
   ```json
   {
     "account_id": "ACC-KYC-001"
   }
   ```
   Notice the returned verdict, regulatory SAR draft, and `challenge_token`.

---

### Exercise 3: Launch the Next.js Operations Console
In a separate terminal:

```powershell
cd frontend
npm run dev
```

Open **`http://localhost:3000`** in your browser.

**What to try in the UI:**
1. Select **`ACC-KYC-001`** (Vladimir Vance - PEP & Smurfing Origin).
2. Click **Initiate Triage**. Watch the live forensic log populate.
3. Observe the **Live Multi-Hop Financial Topology**:
   - The animated glowing amber edges highlight sub-$10,000 structuring transfers ($9,800, $9,750, $9,600, $9,550).
4. Notice the **Two-Phase Cryptographic HITL Approval Gate**:
   - An active challenge token will appear in the pending box (e.g. `SAR-DA9449`).
   - Click **Fill Token**, then click **Authorize & Freeze**.
   - Watch `ACC-KYC-001` turn **FROZEN** with a pulsating rose warning badge!

---

### Exercise 4: Inspect the Negative Control (Legitimate Retail Account)
1. Switch the account selector to **`ACC-CLEAN-005`** (Jordan Smith).
2. Click **Initiate Triage**.
3. Notice that:
   - Structuring count is 0.
   - Outbound volume is only $45.00.
   - PEP flag is False.
   - The agent clears the account: `CLEARED: No illicit structuring or multi-hop smurfing patterns detected.`
   - No freeze token is generated, and no destructive mutation is triggered.

---

### Exercise 5: Connecting to PostgreSQL via Docker Compose
When you are ready to switch from SQLite to PostgreSQL:

1. Start Docker Desktop on Windows.
2. In terminal:
   ```powershell
   docker compose up -d
   ```
3. Restart FastAPI gateway. It will automatically detect PostgreSQL on port 5432 and seed the PostgreSQL schema!

---

## 🎤 Interview Presentation Defense (The 3 Pillars)

When presenting this project in AI Engineering or Staff/Senior AI Architect interviews, frame your responses around these three architectural pillars:

### Pillar 1: Why Model Context Protocol (MCP)?
> *"Standard tool-calling solutions tightly couple proprietary schemas to a specific vendor SDK. By implementing Anthropic's open Model Context Protocol (MCP), the banking tools, regulatory resources, and mutation safeguards are decoupled from the AI model. The exact same FastMCP server can serve Claude Desktop, an automated agent, or Google Gemini 2.5 Flash without rewriting diagnostic functions."*

### Pillar 2: Deterministic Recursive CTEs vs Hallucinatory Vector Embeddings
> *"Vector embeddings fail on relational financial ledgers because money laundering (smurfing, layering, structuring) depends on discrete transaction graphs, timestamp sequences, and statutory monetary thresholds ($9,000 - $9,999). Exposing ANSI-standard recursive CTEs as an MCP analytical tool allows the AI model to trace multi-hop shell accounts deterministically with zero math errors and zero hallucinations."*

### Pillar 3: Blast Radius Control & Two-Phase Cryptographic HITL
> *"In production enterprise finance, an AI agent should NEVER have unconstrained write access to suspend customer accounts or submit regulatory filings. We designed a two-phase challenge-response Human-in-the-Loop (HITL) gate. When the agent attempts an irreversible mutation, the MCP server calculates the blast radius, halts execution, and generates an ephemeral cryptographic token. The write to the database is strictly blocked until an authorized human compliance officer confirms the token in the operations console."*
