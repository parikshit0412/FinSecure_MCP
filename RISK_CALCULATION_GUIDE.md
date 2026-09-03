# 📊 FinSecure-MCP: Account Risk Calculation & Scoring Model

This document explains the comprehensive risk architecture implemented in **FinSecure-MCP**, detailing how risk is modeled, evaluated at runtime, and escalated to regulatory actions.

---

## 🏛️ Two-Tier AML Risk Architecture

In tier-1 financial institutions (e.g., JPMorgan Chase, HSBC, FinCEN regulatory audits), an account's risk cannot be assessed using simple static filters. FinSecure-MCP implements a **Two-Tier Risk Engine**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Composite Account Risk (0 - 100)                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           │                                                 │
┌──────────▼───────────────┐                       ┌─────────▼───────────────┐
│  Tier 1: Static KYC Risk │                       │Tier 2: Dynamic Behavior │
│   (Relational Database)  │                       │   (MCP Real-Time Tools) │
└──────────┬───────────────┘                       └─────────┬───────────────┘
           │                                                 │
  • Jurisdiction / Country                          • Velocity & Structuring
  • Entity Type (Shell vs Person)                   • Recursive SQL Graph Hops
  • PEP Flag (Politically Exposed)                  • Converging Sink Proximity
```

---

## 1. Tier 1: Static KYC Risk Profile (Database Layer)

Defined and seeded in [`backend/database.py`](backend/database.py):

When an account undergoes Know-Your-Customer (KYC) onboarding, it receives an initial base risk score between `0` and `100` according to statutory compliance categories:

| Risk Tier | Score Range | Entity Profile | Examples in Seed Database |
| :--- | :---: | :--- | :--- |
| **Low / Retail** | `0 - 15` | Fully verified individuals, domestic salaried employees, property managers. Clean history with routine expenses. | `ACC-CLEAN-005` (Jordan Smith: 5)<br>`ACC-CLEAN-006` (Sophia Chen: 8)<br>`ACC-CLEAN-007` (Metro Realty: 12)<br>`ACC-CLEAN-008` (David Miller: 10) |
| **Medium / Intermediary** | `65 - 75` | Commercial shell corporations, nominee directors, opaque beneficial ownership, recently incorporated entities. | `ACC-SHELL-002` (BlueHorizon Holdings: 70)<br>`ACC-SHELL-003` (Apex Logistics: 65)<br>`ACC-MULE-012` (Liam Brooks: 75) |
| **High / PEP** | `85 - 94` | Politically Exposed Persons (PEPs), senior foreign public figures, higher susceptibility to bribery, sanctions, or embezzlement. | `ACC-KYC-001` (Vladimir Vance: 85, PEP=True)<br>`ACC-FRAUD-009` (Marcus Thorne: 94, PEP=True) |
| **Critical / Sink** | `90 - 96` | High-risk offshore accounts, unverified custodial crypto wallets, dark liquidity sinks. | `ACC-DEST-004` (Elena Rostova: 90)<br>`ACC-DEST-011` (Kowloon Custody: 96) |

---

## 2. Tier 2: Dynamic Behavioral Risk (FastMCP Engine)

Evaluated in real-time by the AI Agent using the Model Context Protocol in [`backend/server.py`](backend/server.py).

### Factor A: Politically Exposed Person (PEP) Multiplier
- **MCP Tool**: `check_sanctions_and_pep(account_id)`
- **Mechanism**: Reads regulatory sanctions registries and flags whether the account holder is a PEP.
- **Rule**: If `is_pep == True` or `risk_score > 80`, statutory policy mandates an **Elevated Audit**. Any high-velocity outbound funds trigger immediate escalation.

### Factor B: Velocity & Smurfing Structuring
- **MCP Tool**: `calculate_velocity_score(account_id)`
- **Mechanism**: Executes real-time aggregation across the ledger:
  ```sql
  SELECT 
      COUNT(*) as total_transfers, 
      SUM(amount) as total_volume,
      COUNT(CASE WHEN amount BETWEEN 9000 AND 9999 THEN 1 END) as structured_tx_count
  FROM transactions 
  WHERE source_account = %s;
  ```
- **Rule**:
  - The statutory Currency Transaction Report (CTR) threshold is **$10,000**.
  - Transfers split between **$9,000 and $9,999** indicate intentional "structuring" (smurfing).
  - If `structured_tx_count >= 2`, the tool sets `structuring_flag = True`.

### Factor C: Multi-Hop Topological Graph Traversal
- **MCP Tool**: `trace_transaction_hops(source_account, max_hops=2)`
- **Mechanism**: Executes a deterministic **Recursive Common Table Expression (CTE)** query:
  ```sql
  WITH RECURSIVE fund_graph AS (
      SELECT source_account, destination_account, amount, 1 AS hop_depth, ...
      FROM transactions WHERE source_account = %s
      UNION ALL
      SELECT t2.source_account, t2.destination_account, t2.amount, fg.hop_depth + 1, ...
      FROM transactions t2
      INNER JOIN fund_graph fg ON t2.source_account = fg.destination_account
      WHERE fg.hop_depth < %s
  )
  SELECT * FROM fund_graph ORDER BY hop_depth ASC;
  ```
- **Risk Indicator**: Traces whether outbound funds fan out into intermediary shell accounts (Hop 1) and subsequently converge onto a unified destination sink (Hop 2).

---

## 3. Mathematical Dynamic Risk Composite (Optional Enterprise Scoring)

For institutions utilizing a unified 0–100 composite index, the dynamic risk can be computed as:

$$\text{Composite Risk} = \min\Big(100,\; w_{\text{kyc}} \cdot R_{\text{base}} + w_{\text{vel}} \cdot R_{\text{struct}} + w_{\text{graph}} \cdot R_{\text{sink}} + w_{\text{pep}} \cdot R_{\text{pep}}\Big)$$

Where:
- $R_{\text{base}}$: Base KYC score (0–100) — Weight: **30%** ($w_{\text{kyc}} = 0.30$)
- $R_{\text{struct}}$: Structuring penalty: $50 \times \min(1, \frac{\text{Structured Transfers}}{2})$ — Weight: **35%** ($w_{\text{vel}} = 0.35$)
- $R_{\text{sink}}$: Graph Sink Proximity penalty (if funds reach a risk $\ge 90$ sink) — Weight: **20%** ($w_{\text{graph}} = 0.20$)
- $R_{\text{pep}}$: PEP exposure multiplier ($+15$ if PEP=True) — Weight: **15%** ($w_{\text{pep}} = 0.15$)

---

## 4. Tier 3: Terminal State Mutation (Human-in-the-Loop Gate)

Implemented in `freeze_account_and_file_sar()`:

1. **Attempted Freeze**: When Tier 1 and Tier 2 criteria indicate fraud, the AI agent attempts to freeze the account.
2. **Blast Radius Interception**: The FastMCP server blocks the SQL write, computes the blast radius, and emits an ephemeral challenge token (e.g. `SAR-8B95A9`).
3. **Cryptographic Authorization**: Once confirmed by a human compliance officer:
   ```sql
   UPDATE accounts SET status = 'FROZEN', risk_score = 100 WHERE id = %s;
   INSERT INTO sar_reports (account_id, reason, filed_by) VALUES (%s, %s, 'AI-Agent-Supervised');
   ```
4. The account's risk score is permanently locked to **`100`** and its status transitions to **`FROZEN`**, which turns the node card into glowing red in the operations console.
