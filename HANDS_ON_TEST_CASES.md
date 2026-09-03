# 🧪 FinSecure-MCP: Hands-On Test Cases & Learning Lab Guide

This document contains **10 comprehensive, step-by-step test cases** designed to help you thoroughly understand every layer of FinSecure-MCP:
- How **Model Context Protocol (MCP)** tools and resources work.
- How **Anti-Money Laundering (AML) smurfing and structuring** are detected.
- How the **Two-Phase Cryptographic HITL Approval Gate** prevents unauthorized AI actions.
- How you, as the **Human Compliance Officer**, directly intervene, freeze, unfreeze, and audit filings.

---

## 📋 Test Matrix Overview

| Test ID | Test Name | Purpose | What You Learn |
| :---: | :--- | :--- | :--- |
| **TC-01** | **The Clean Account Baseline** | Test negative control on non-suspicious retail user | How AI clears legitimate daily transactions without false positives |
| **TC-02** | **Smurfing Detection & Multi-Hop Traversal** | Test positive detection on Vladimir Vance (`ACC-KYC-001`) | How recursive SQL CTE and velocity tools detect sub-$10k smurfing |
| **TC-03** | **Two-Phase HITL Gate Authorization** | Authorize freeze using generated challenge token | How blast radius is controlled and mutations are locked to human approval |
| **TC-04** | **Challenge Token Tamper & Rejection Test** | Enter an invalid or fake token (e.g. `SAR-FAKE99`) | How the server cryptographically blocks unauthorized writes |
| **TC-05** | **Dynamic Attack Injection (Smurf Clean User)** | Turn clean engineer Sophia Chen into a mule | Proves risk is 100% dynamic, not hardcoded |
| **TC-06** | **Human Officer Direct Emergency Freeze** | Manually block Marcus Thorne without AI triage | How human officers exercise administrative sovereignty |
| **TC-07** | **Unfreeze & False Positive Recovery** | Restore a frozen account back to ACTIVE | How banks remediate false alarms and reset risk |
| **TC-08** | **Statutory SAR Filing Audit Inspection** | Inspect the FinCEN 31 CFR § 1020.320 audit ledger | How regulatory records track Human vs AI filed SARs |
| **TC-09** | **Custom Entity & Transfer Creation** | Create custom account and transfer via Flow Injector | How the database dynamically re-renders the topology graph |
| **TC-10** | **Automated Terminal CLI Lab Execution** | Run `test_mcp.py` headless from command prompt | How the Python MCP server functions independently of the frontend |

---

## 🛠️ Step-by-Step Test Execution Instructions

Open your browser at **[http://localhost:3000](http://localhost:3000)** (or `http://localhost:3001`).

---

### Test Case 1: The Clean Account Baseline (Negative Control)
* **Objective**: Verify that legitimate retail banking activity is cleared without alarms.
* **Steps**:
  1. In the target dropdown, select **`ACC-CLEAN-006`** (`Sophia Chen - Software Engineer`).
  2. Click the amber **`Initiate Triage`** button.
* **What to Observe in the Forensic Log**:
  - `check_sanctions_and_pep`: `PEP Status: False`, `Risk Score: 8`.
  - `calculate_velocity_score`: `Structuring Flag: False`, `Structured Transfers: 0`.
  - `trace_transaction_hops`: Discovers legitimate rent payment ($2,400) and repair bill ($350).
  - Verdict: **`CLEARED: No illicit structuring or multi-hop smurfing patterns detected.`**
  - **Notice**: No freeze token is generated, and the account remains `ACTIVE`.

---

### Test Case 2: Smurfing Detection & Multi-Hop Traversal (Positive Control)
* **Objective**: Verify that sub-$10k structuring split across shell entities is detected.
* **Steps**:
  1. In the target dropdown, select **`ACC-KYC-001`** (`Vladimir Vance - PEP, Smurfing Origin`).
  2. Click **`Initiate Triage`**.
* **What to Observe**:
  - **Dynamic PII Redaction**: Notice the tax ID is masked as `****-****-****-****`.
  - **Velocity Score**: Detects 2 sub-$10k transfers ($9,800 + $9,750), total $19,550. `structuring_flag = True`.
  - **Graph Hops**: Recursive SQL traces:
    - Hop 1: `ACC-KYC-001` $\rightarrow$ `ACC-SHELL-002` & `ACC-SHELL-003`.
    - Hop 2: Shells forward $9,600 and $9,550 $\rightarrow$ `ACC-DEST-004` (Elena Rostova).
  - **HITL Interception**: The AI attempts to freeze the account, but the server halts it:
    `ACTION_HALTED_HITL_REQUIRED: Challenge Token Generated: [SAR-XXXXXX]`.
  - The token automatically populates in the **Two-Phase Cryptographic HITL Approval Gate**.

---

### Test Case 3: Two-Phase HITL Gate Authorization
* **Objective**: Confirm that entering the valid challenge token executes the database write.
* **Steps**:
  1. Follow Test Case 2 so an active challenge token is generated (e.g. `SAR-DA9449`).
  2. In the HITL box, click **`Fill Token`** (or copy-paste the token into the input).
  3. Click the red **`Authorize & Freeze`** button.
* **Expected Result**:
  - The forensic log updates: `SUCCESS: Account ACC-KYC-001 has been FROZEN. Suspicious Activity Report filed successfully.`
  - In the live topology graph, the `ACC-KYC-001` node card turns **pulsating red** with badge **`FROZEN`** and **`Risk: 100/100`**.

---

### Test Case 4: Challenge Token Tamper & Rejection Test
* **Objective**: Verify that an invalid or expired token is physically rejected by the MCP server.
* **Steps**:
  1. Select **`ACC-FRAUD-009`** (Marcus Thorne).
  2. In the challenge token input box, type a fake token: **`SAR-FAKE99`**.
  3. Click **`Authorize & Freeze`**.
* **Expected Result**:
  - The server refuses the mutation: `REJECTED: Invalid or expired confirmation token for account ACC-FRAUD-009.`
  - The account remains `ACTIVE` — the database was protected from unauthorized tampering.

---

### Test Case 5: Dynamic Attack Injection (Smurf a Clean User)
* **Objective**: Prove that risk is computed dynamically from live transactions, not hardcoded.
* **Steps**:
  1. In the top-right header, click **`⚡ Inject Flows & Test`** to open the simulator.
  2. Click the red button: **`Quick Scenario: Smurf Sophia Chen`**.
     *(This automatically injects two transfers of $9,800 and $9,750 from Sophia Chen to shell accounts into the database).*
  3. In the graph, notice new glowing amber animated edges appear originating from `ACC-CLEAN-006`.
  4. Now click **`Initiate Triage`** on `ACC-CLEAN-006`.
* **Expected Result**:
  - Sophia Chen—who was previously cleared in TC-01—is now flagged:
    `Structuring Flag: True | Structured Transfers: 2 | Total Volume: $19,550.00`.
  - The agent generates a freeze challenge token for her!

---

### Test Case 6: Human Officer Direct Emergency Intervention
* **Objective**: Verify that human compliance officers can freeze accounts directly without AI triage.
* **Steps**:
  1. Select **`ACC-FRAUD-009`** (`Marcus Thorne - Risk 94`).
  2. Scroll down to the **Human Officer Direct Intervention Console**.
  3. In the justification box, type: *"Officer detected undisclosed shell routing to Kowloon digital custody."*
  4. Click **`Emergency Direct Freeze`**.
* **Expected Result**:
  - A notification appears: `🛑 Account ACC-FRAUD-009 has been FROZEN and SAR filed by Human Compliance Officer.`
  - The graph node immediately turns **red / FROZEN**.

---

### Test Case 7: Unfreeze & False Positive Recovery
* **Objective**: Verify that a human officer can remediate a false positive and restore an account.
* **Steps**:
  1. Keep **`ACC-FRAUD-009`** selected (it is currently `FROZEN`).
  2. Notice the button in the Officer Intervention console has changed to green: **`Unfreeze & Restore Account`**.
  3. Click **`Unfreeze & Restore Account`**.
* **Expected Result**:
  - Account status flips from `FROZEN` back to **`ACTIVE`**.
  - Its risk score resets from 100 back to normal (`20`).
  - In the graph, the red alert clears and returns to the normal badge.

---

### Test Case 8: Statutory SAR Filing Audit Inspection
* **Objective**: Inspect the regulatory audit log for compliance with 31 CFR § 1020.320.
* **Steps**:
  1. In the top-right header, click the **`SAR Reports (X)`** button.
  2. Review the modal table of all filed reports.
* **What to Verify**:
  - Notice the **`Filed By`** column distinguishes between:
    - `AI-Agent-Supervised` (filed through the HITL token workflow).
    - `Human-Compliance-Officer` (filed via direct emergency intervention).
  - Verify that each report contains an ID, target account, timestamp, and legal reason.

---

### Test Case 9: Custom Entity & Transfer Injection
* **Objective**: Test dynamic scalability by creating a brand-new entity and watching the graph adapt.
* **Steps**:
  1. Open the **`⚡ Inject Flows & Test`** panel.
  2. In the "Create New KYC Account" form (right side):
     - Account ID: **`ACC-CORP-777`**
     - Holder Name: **`Panama Maritime Logistics`**
     - Risk Slider: **`88`**
     - Check **`PEP Flag`**.
     - Click **`Register Account in Database`**.
  3. In the "Inject Custom Financial Transfer" form (left side):
     - Source: **`ACC-CORP-777`**
     - Destination: **`ACC-DEST-004`**
     - Click **`$9,800 (Smurf)`**.
     - Click **`Inject Transfer into Database`**.
* **Expected Result**:
  - `ACC-CORP-777` appears in the graph and in the target dropdown selector.
  - Selecting it and clicking Triage runs the complete AML analysis on your custom entity!

---

### Test Case 10: Headless Terminal CLI Lab Execution
* **Objective**: Test the FastMCP Python server and SQLite/PostgreSQL engine without opening a browser.
* **Steps**:
  1. Open your terminal in the project root:
     ```powershell
     backend\venv\Scripts\python backend/test_mcp.py
     ```
* **Expected Result**:
  - Runs all 9 internal steps automatically:
    - Seeding database.
    - Reading PII-masked audit log.
    - Calculating velocity score.
    - Executing recursive CTE graph hops.
    - Testing Phase 1 token generation.
    - Testing Phase 2 token authorization.
    - Testing negative control (`ACC-CLEAN-006`).
  - Output ends with: `[OK] All MCP Resources, Tools, and HITL Gates Verified Successfully!`

---

## 🔄 How to Reset the Environment Anytime
If you have frozen accounts or injected test transactions and want to return to the clean starting state:
1. Open the **`⚡ Inject Flows & Test`** panel.
2. Click **`Reset Ledger`**.
All tables are instantly restored to the clean baseline!
