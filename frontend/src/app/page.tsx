"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShieldAlert,
  Search,
  Play,
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Cpu,
  Database,
  BookOpen,
  PlusCircle,
  Zap,
  RotateCcw,
  ArrowRight,
  UserPlus,
  FileText,
  ShieldBan,
  ShieldCheck,
  Activity,
  DollarSign,
  Layers,
  Table,
  Radio,
  Terminal,
  Building,
  CheckCircle,
  TrendingUp
} from "lucide-react";
import FlowVisualizer from "@/components/FlowVisualizer";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? (typeof window !== "undefined" && window.location.port === "3000" ? "http://localhost:8000" : "");

type ActiveTab = "graph" | "ledger" | "sars" | "simulator";

export default function ComplianceDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("graph");
  const [targetAccount, setTargetAccount] = useState("ACC-KYC-001");
  const [tokenInput, setTokenInput] = useState("");
  const [detectedToken, setDetectedToken] = useState("");
  const [verdict, setVerdict] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Officer Direct Action Inputs
  const [officerReason, setOfficerReason] = useState("");

  // Ledger Filter State
  const [ledgerSearch, setLedgerSearch] = useState("");

  // New Transaction Form State
  const [txSource, setTxSource] = useState("ACC-CLEAN-006");
  const [txDest, setTxDest] = useState("ACC-SHELL-002");
  const [txAmount, setTxAmount] = useState("9800");

  // New Account Form State
  const [newAccId, setNewAccId] = useState("");
  const [newAccName, setNewAccName] = useState("");
  const [newAccRisk, setNewAccRisk] = useState("45");
  const [newAccPep, setNewAccPep] = useState(false);

  const [systemHealth, setSystemHealth] = useState<{
    database_engine: string;
    accounts_count: number;
    transactions_count: number;
    gemini_api_configured: boolean;
  } | null>(null);

  const [graphData, setGraphData] = useState<{ accounts: any[]; transactions: any[] }>({
    accounts: [],
    transactions: [],
  });

  const [sarReports, setSarReports] = useState<any[]>([]);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
      }
    } catch {
      setSystemHealth(null);
    }
  }, []);

  const loadGraph = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/graph/${targetAccount}`);
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
      }
    } catch (e) {
      console.error("Failed to load graph ledger data", e);
    }
  }, [targetAccount]);

  const loadSarReports = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sar-reports`);
      if (res.ok) {
        const data = await res.json();
        setSarReports(data.reports || []);
      }
    } catch (e) {
      console.error("Failed to load SAR reports", e);
    }
  }, []);

  const pollPendingToken = useCallback(async (accountId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/pending-token/${accountId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.challenge_token) {
          setDetectedToken(data.challenge_token);
        }
      }
    } catch (e) {
      console.error("Failed to check pending token", e);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    loadGraph();
    loadSarReports();
    pollPendingToken(targetAccount);
  }, [targetAccount, checkHealth, loadGraph, loadSarReports, pollPendingToken]);

  const notify = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 4500);
  };

  // Top Metrics Calculations
  const metrics = useMemo(() => {
    const totalVolume = graphData.transactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const structuredTxs = graphData.transactions.filter(
      (t) => Number(t.amount) >= 9000 && Number(t.amount) <= 9999
    ).length;
    const frozenAccounts = graphData.accounts.filter((a) => a.status === "FROZEN").length;

    return {
      totalVolume,
      structuredTxs,
      frozenAccounts,
      totalTxs: graphData.transactions.length,
      totalAccounts: graphData.accounts.length,
      sarCount: sarReports.length,
    };
  }, [graphData, sarReports]);

  const triggerTriage = async (withToken: string = "") => {
    setLoading(true);
    setVerdict("");
    try {
      const res = await fetch(`${API_BASE}/api/investigate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: targetAccount, action_token: withToken }),
      });
      const data = await res.json();
      setVerdict(data.verdict || "No response received.");
      if (data.challenge_token) {
        setDetectedToken(data.challenge_token);
        setTokenInput(data.challenge_token);
      } else if (withToken) {
        setDetectedToken("");
        setTokenInput("");
      }
      await loadGraph();
      await checkHealth();
      await loadSarReports();
    } catch {
      setVerdict(
        "❌ Connection Error: Unable to connect to FinSecure AI Gateway at http://localhost:8000.\n" +
        "Ensure the FastAPI server is running with:\n  uvicorn backend.api:app --reload --port 8000"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOfficerFreeze = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/officer/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: targetAccount,
          action: "FREEZE",
          justification: officerReason.trim() || "Emergency freeze executed by Human Compliance Officer.",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        notify(`🛑 ${data.message}`);
        setOfficerReason("");
        await loadGraph();
        await loadSarReports();
        await checkHealth();
      } else {
        const err = await res.json();
        notify(`Error: ${err.detail || "Action failed"}`);
      }
    } catch {
      notify("Failed to connect to backend.");
    }
  };

  const handleOfficerCascadeFreeze = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/officer/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: targetAccount,
          action: "CASCADE_FREEZE",
          justification: officerReason.trim() || "Full-chain syndicate blast-radius freeze authorized by Human Compliance Officer.",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        notify(`🚨 ${data.message}`);
        setOfficerReason("");
        await loadGraph();
        await loadSarReports();
        await checkHealth();
      } else {
        const err = await res.json();
        notify(`Error: ${err.detail || "Cascade action failed"}`);
      }
    } catch {
      notify("Failed to connect to backend.");
    }
  };

  const handleOfficerUnfreeze = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/officer/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: targetAccount,
          action: "UNFREEZE",
          new_risk_score: 20,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        notify(`🟢 ${data.message}`);
        await loadGraph();
        await checkHealth();
      } else {
        const err = await res.json();
        notify(`Error: ${err.detail || "Action failed"}`);
      }
    } catch {
      notify("Failed to connect to backend.");
    }
  };

  const handleOfficerFileSar = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/officer/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: targetAccount,
          action: "FILE_SAR",
          justification: officerReason.trim() || "Manual SAR filed following compliance officer review.",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        notify(`📝 ${data.message}`);
        setOfficerReason("");
        await loadSarReports();
      }
    } catch {
      notify("Failed to connect to backend.");
    }
  };

  const handleInjectTransaction = async () => {
    const amt = parseFloat(txAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      notify("Please enter a valid transfer amount.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_account: txSource,
          destination_account: txDest,
          amount: amt,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        notify(`⚡ Transaction ${data.transaction_id} ($${amt.toLocaleString()}) injected from ${txSource} → ${txDest}!`);
        await loadGraph();
        await checkHealth();
      } else {
        const err = await res.json();
        notify(`Error: ${err.detail || "Failed to inject transaction"}`);
      }
    } catch {
      notify("Failed to connect to backend.");
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccId.trim() || !newAccName.trim()) {
      notify("Please enter an Account ID and Holder Name.");
      return;
    }
    const cleanId = newAccId.trim().toUpperCase();
    try {
      const res = await fetch(`${API_BASE}/api/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cleanId,
          holder_name: newAccName.trim(),
          risk_score: parseInt(newAccRisk) || 10,
          is_pep: newAccPep,
        }),
      });
      if (res.ok) {
        notify(`✅ Account ${cleanId} successfully created in ledger!`);
        setNewAccId("");
        setNewAccName("");
        await loadGraph();
        await checkHealth();
      } else {
        const err = await res.json();
        notify(`Error: ${err.detail || "Failed to create account"}`);
      }
    } catch {
      notify("Failed to connect to backend.");
    }
  };

  const handleResetDatabase = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reset-db`, { method: "POST" });
      if (res.ok) {
        notify("🔄 Ledger reset to clean baseline successfully.");
        setVerdict("");
        setDetectedToken("");
        setTokenInput("");
        await loadGraph();
        await checkHealth();
        await loadSarReports();
      }
    } catch {
      notify("Failed to reset database.");
    }
  };

  const handleQuickAttackSophia = async () => {
    try {
      await fetch(`${API_BASE}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_account: "ACC-CLEAN-006", destination_account: "ACC-SHELL-002", amount: 9800 }),
      });
      await fetch(`${API_BASE}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_account: "ACC-CLEAN-006", destination_account: "ACC-SHELL-003", amount: 9750 }),
      });
      setTargetAccount("ACC-CLEAN-006");
      notify("🚨 Smurfing attack injected on Sophia Chen ($9,800 + $9,750)! Click 'Initiate Triage' to detect!");
      await loadGraph();
      await checkHealth();
    } catch {
      notify("Failed to inject smurfing flow.");
    }
  };

  const copyVerdict = () => {
    if (verdict) {
      navigator.clipboard.writeText(verdict);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentAccObj = graphData.accounts.find((a) => a.id === targetAccount);
  const isTargetFrozen = currentAccObj?.status === "FROZEN";

  const filteredTransactions = useMemo(() => {
    if (!ledgerSearch.trim()) return graphData.transactions;
    const q = ledgerSearch.toLowerCase();
    return graphData.transactions.filter(
      (t) =>
        t.id?.toLowerCase().includes(q) ||
        t.source_account.toLowerCase().includes(q) ||
        t.destination_account.toLowerCase().includes(q) ||
        String(t.amount).includes(q)
    );
  }, [graphData.transactions, ledgerSearch]);

  return (
    <main className="min-h-screen w-full bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-indigo-100">
      {/* 1. Executive Global Header (Stripe / Mercury Bank Aesthetic) */}
      <header className="w-full bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700 shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold tracking-tight text-slate-900 font-sans">
                FinSecure<span className="text-indigo-600">.ai</span>
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold tracking-wide flex items-center gap-1.5">
                <CheckCircle className="w-2.5 h-2.5 text-indigo-600" />
                <span>COMPLIANCE SUITE</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal">
              Automated Anti-Money Laundering Triage & Regulatory Governance Console
            </p>
          </div>
        </div>

        {/* System Badges & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 shadow-xs">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400 font-mono text-[10px]">LEDGER:</span>
            <span className="font-bold text-slate-800 uppercase text-[11px]">
              {systemHealth?.database_engine || "SQLITE"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 shadow-xs">
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-400 font-mono text-[10px]">ENGINE:</span>
            <span className="font-bold text-indigo-700 text-[11px]">
              {systemHealth?.gemini_api_configured ? "Gemini 2.5 Flash" : "FastMCP 4.0"}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5" />
          </div>

          <button
            onClick={handleResetDatabase}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition shadow-xs cursor-pointer"
            title="Reset Ledger to Default Seed"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              loadGraph();
              checkHealth();
              loadSarReports();
              pollPendingToken(targetAccount);
            }}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition shadow-xs cursor-pointer"
            title="Refresh System State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Real-time Toast Notice */}
      {statusNotice && (
        <div className="mx-4 sm:mx-8 mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-mono text-indigo-900 flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-semibold">{statusNotice}</span>
          </div>
          <button onClick={() => setStatusNotice(null)} className="text-indigo-600 hover:text-indigo-950 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* 2. Top Metric HUD Ticker Cards (Clean Executive White) */}
      <div className="px-4 sm:px-8 pt-5 pb-2 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center justify-between hover:border-slate-300 transition">
          <div>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-semibold">
              Monitored Network Volume
            </div>
            <div className="text-2xl font-bold font-sans text-slate-900 tracking-tight">
              ${metrics.totalVolume.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {metrics.totalTxs} verified transactions
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center justify-between hover:border-slate-300 transition">
          <div>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-semibold">
              Structuring Radar Hits
            </div>
            <div className="text-2xl font-bold font-sans text-amber-700 tracking-tight flex items-center gap-1.5">
              {metrics.structuredTxs} <span className="text-xs font-normal text-slate-500">transfers</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Sub-$10k smurfing violations
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center justify-between hover:border-slate-300 transition">
          <div>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-semibold">
              Frozen Accounts
            </div>
            <div className="text-2xl font-bold font-sans text-rose-600 tracking-tight flex items-center gap-2">
              {metrics.frozenAccounts} <span className="text-xs font-normal text-slate-500">entities</span>
              {metrics.frozenAccounts > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Containment enforced
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
            <ShieldBan className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center justify-between hover:border-slate-300 transition">
          <div>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 font-semibold">
              Statutory SAR Reports
            </div>
            <div className="text-2xl font-bold font-sans text-emerald-700 tracking-tight">
              {metrics.sarCount} <span className="text-xs font-normal text-slate-500">filings</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              FinCEN 31 CFR § 1020.320
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Main Operational Workstage (Full Width) */}
      <div className="flex-1 w-full px-4 sm:px-8 py-4 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Main Visual Stage */}
        <section className="xl:col-span-8 flex flex-col gap-4">
          {/* Action & Tab Navigation Header */}
          <div className="bg-white border border-slate-200 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
            {/* View Mode Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setActiveTab("graph")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === "graph"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Forensic Graph</span>
              </button>

              <button
                onClick={() => setActiveTab("ledger")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === "ledger"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Ledger Matrix ({graphData.transactions.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("sars")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === "sars"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>SAR Filings ({sarReports.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("simulator")}
                className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === "simulator"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Scenario Injector</span>
              </button>
            </div>

            {/* Target Account Selector & Triage Trigger */}
            <div className="flex flex-1 sm:flex-initial items-center gap-2.5 min-w-[320px]">
              <select
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 font-mono cursor-pointer flex-1"
                value={targetAccount}
                onChange={(e) => setTargetAccount(e.target.value)}
              >
                <optgroup label="⚠️ SUSPICIOUS & FRAUD SYNDICATES">
                  <option value="ACC-KYC-001">ACC-KYC-001 | Vladimir Vance (PEP, Smurfing Origin)</option>
                  <option value="ACC-FRAUD-009">ACC-FRAUD-009 | Marcus Thorne (PEP Offshore Politician)</option>
                  <option value="ACC-MULE-012">ACC-MULE-012 | Liam Brooks (Money Mule)</option>
                  <option value="ACC-DEST-004">ACC-DEST-004 | Elena Rostova (Syndicate Treasury Sink)</option>
                  <option value="ACC-DEST-011">ACC-DEST-011 | Kowloon Custody (Offshore Dark Sink)</option>
                </optgroup>
                <optgroup label="✅ LEGITIMATE CLEAN ACCOUNTS">
                  <option value="ACC-CLEAN-006">ACC-CLEAN-006 | Sophia Chen (Software Engineer)</option>
                  <option value="ACC-CLEAN-007">ACC-CLEAN-007 | Metro Realty (Property Mgmt)</option>
                  <option value="ACC-CLEAN-008">ACC-CLEAN-008 | David Miller (Contractor)</option>
                  <option value="ACC-CLEAN-005">ACC-CLEAN-005 | Jordan Smith (Retail Freelancer)</option>
                </optgroup>
                {graphData.accounts
                  .filter(
                    (a) =>
                      ![
                        "ACC-KYC-001",
                        "ACC-FRAUD-009",
                        "ACC-MULE-012",
                        "ACC-DEST-004",
                        "ACC-DEST-011",
                        "ACC-CLEAN-006",
                        "ACC-CLEAN-007",
                        "ACC-CLEAN-008",
                        "ACC-CLEAN-005",
                      ].includes(a.id)
                  )
                  .map((a) => (
                    <option key={`custom-${a.id}`} value={a.id}>
                      {a.id} | {a.holder_name} (Risk: {a.risk_score} | {a.status})
                    </option>
                  ))}
              </select>

              <button
                onClick={() => triggerTriage()}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{loading ? "Examining..." : "Initiate Triage"}</span>
              </button>
            </div>
          </div>

          {/* Active View Stage */}
          <div className="w-full flex-1">
            {/* TAB 1: Visual Topology Graph */}
            {activeTab === "graph" && (
              <div className="w-full h-[660px]">
                <FlowVisualizer
                  accounts={graphData.accounts}
                  transactions={graphData.transactions}
                  highlightAccount={targetAccount}
                />
              </div>
            )}

            {/* TAB 2: Relational Ledger Table */}
            {activeTab === "ledger" && (
              <div className="w-full h-[660px] bg-white border border-slate-200 rounded-2xl p-4 flex flex-col shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-800">
                    <Table className="w-4 h-4 text-indigo-600" />
                    <span>Live Relational Transaction Ledger ({filteredTransactions.length} records)</span>
                  </div>
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search accounts or amount..."
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto mt-3">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase bg-slate-50 sticky top-0">
                        <th className="py-2.5 px-3">TX ID</th>
                        <th className="py-2.5 px-3">Source Account</th>
                        <th className="py-2.5 px-3">Destination</th>
                        <th className="py-2.5 px-3">Amount ($ USD)</th>
                        <th className="py-2.5 px-3">Pattern Type</th>
                        <th className="py-2.5 px-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.map((tx) => {
                        const isSmurfing = Number(tx.amount) >= 9000 && Number(tx.amount) <= 9999;
                        return (
                          <tr key={`tx-row-${tx.id}`} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3 font-bold text-slate-700">{tx.id}</td>
                            <td className="py-2.5 px-3">
                              <span className="text-indigo-700 font-semibold">{tx.source_account}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{tx.destination_account}</td>
                            <td className="py-2.5 px-3 font-bold">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] ${
                                  isSmurfing
                                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold"
                                    : "text-slate-800"
                                }`}
                              >
                                ${Number(tx.amount).toLocaleString()}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[11px]">
                              {isSmurfing ? (
                                <span className="text-indigo-700 font-semibold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-indigo-600" /> Sub-$10k Structuring
                                </span>
                              ) : (
                                <span className="text-slate-500">Normal Commerce</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                onClick={() => setTargetAccount(tx.source_account)}
                                className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer font-semibold"
                              >
                                Trace Source
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: Regulatory SAR Filings Audit Ledger */}
            {activeTab === "sars" && (
              <div className="w-full h-[660px] bg-white border border-slate-200 rounded-2xl p-4 flex flex-col shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-800">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Statutory Suspicious Activity Reports (SAR) Audit Ledger (31 CFR § 1020.320)</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    Total Filings: <strong className="text-slate-900">{sarReports.length}</strong>
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto mt-3 space-y-3">
                  {sarReports.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 font-mono text-xs">
                      No Suspicious Activity Reports filed yet. Run triage on a fraud account or execute a direct freeze.
                    </div>
                  ) : (
                    sarReports.map((sar) => (
                      <div
                        key={`sar-row-${sar.id}`}
                        className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-2 font-mono text-xs shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-200 font-bold">
                              SAR #{sar.id}
                            </span>
                            <span className="text-slate-900 font-bold text-sm">{sar.account_id}</span>
                            {sar.holder_name && <span className="text-slate-500">({sar.holder_name})</span>}
                          </div>
                          <span className="text-[11px] text-slate-400">{sar.filed_at}</span>
                        </div>
                        <p className="text-slate-700 text-xs leading-relaxed pl-1">{sar.reason}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                          <span>Jurisdiction: FinCEN Bank Secrecy Act Filing</span>
                          <span className="text-indigo-700 font-bold">Authority: {sar.filed_by}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: Flow Simulator & Scenario Injector */}
            {activeTab === "simulator" && (
              <div className="w-full h-[660px] bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-xs overflow-y-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-slate-200 gap-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-indigo-600" />
                      <span>Financial Flow Simulator & Dynamic Injector</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Inject transactions or register new entities directly into the database to test dynamic graph traversal.
                    </p>
                  </div>

                  <button
                    onClick={handleQuickAttackSophia}
                    className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Quick Scenario: Smurf Sophia Chen</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Left Form: Inject Custom Transfer */}
                  <div className="md:col-span-7 bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase">
                      <PlusCircle className="w-4 h-4 text-indigo-600" />
                      <span>Inject Custom Transfer</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Source Account</label>
                        <select
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800"
                          value={txSource}
                          onChange={(e) => setTxSource(e.target.value)}
                        >
                          {graphData.accounts.map((a) => (
                            <option key={`sim-src-${a.id}`} value={a.id}>
                              {a.id} ({a.holder_name})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Destination Account</label>
                        <select
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800"
                          value={txDest}
                          onChange={(e) => setTxDest(e.target.value)}
                        >
                          {graphData.accounts.map((a) => (
                            <option key={`sim-dest-${a.id}`} value={a.id}>
                              {a.id} ({a.holder_name})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Amount ($ USD)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={txAmount}
                          onChange={(e) => setTxAmount(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900"
                        />
                        <button
                          onClick={() => setTxAmount("9800")}
                          className="text-[10px] font-mono px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 cursor-pointer font-bold"
                        >
                          $9,800 (Smurf)
                        </button>
                        <button
                          onClick={() => setTxAmount("15000")}
                          className="text-[10px] font-mono px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 cursor-pointer font-bold"
                        >
                          $15,000 (CTR)
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleInjectTransaction}
                      className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Inject Transfer into Database Ledger</span>
                    </button>
                  </div>

                  {/* Right Form: Create New KYC Account */}
                  <div className="md:col-span-5 bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase">
                      <UserPlus className="w-4 h-4 text-indigo-600" />
                      <span>Create New KYC Account</span>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Account ID</label>
                      <input
                        type="text"
                        placeholder="e.g. ACC-CORP-999"
                        value={newAccId}
                        onChange={(e) => setNewAccId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">Holder Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Cayman Offshore Holdings"
                        value={newAccName}
                        onChange={(e) => setNewAccName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex-1">
                        <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                          Risk Score: <strong className="text-slate-800">{newAccRisk}</strong>
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="99"
                          value={newAccRisk}
                          onChange={(e) => setNewAccRisk(e.target.value)}
                          className="w-full accent-indigo-600"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs font-mono text-slate-700 pt-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newAccPep}
                          onChange={(e) => setNewAccPep(e.target.checked)}
                          className="accent-indigo-600"
                        />
                        <span>PEP Flag</span>
                      </label>
                    </div>

                    <button
                      onClick={handleCreateAccount}
                      className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Register Account in Database</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Column (4 cols): Operations & Intervention Deck */}
        <section className="xl:col-span-4 flex flex-col gap-4">
          {/* Card A: Two-Phase Cryptographic HITL Approval Gate */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                <Lock className="w-4 h-4" />
                <span>Two-Phase HITL Gate</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Blast Radius Containment</span>
            </div>

            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
              Mutating operations are halted by FastMCP. The write is locked until confirmed with an ephemeral challenge token.
            </p>

            {detectedToken && (
              <div className="mb-2.5 p-2 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-indigo-900 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>
                    Challenge Token: <strong className="text-slate-900 font-bold tracking-wider">{detectedToken}</strong>
                  </span>
                </div>
                <button
                  onClick={() => setTokenInput(detectedToken)}
                  className="text-[10px] uppercase font-bold text-indigo-700 hover:text-indigo-900 px-2 py-0.5 rounded bg-white border border-indigo-200 hover:bg-indigo-50 transition cursor-pointer"
                >
                  Fill Token
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Challenge Token (e.g. SAR-XXXXXX)"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs flex-1 font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
              <button
                onClick={() => triggerTriage(tokenInput)}
                disabled={loading || !tokenInput.trim()}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Authorize</span>
              </button>
            </div>
          </div>

          {/* Card B: Human Officer Direct Intervention Console */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                <ShieldBan className="w-4 h-4 text-rose-600" />
                <span>Officer Direct Intervention</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="text-slate-400">Target:</span>
                <span className="text-slate-900 font-bold">{targetAccount}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                    isTargetFrozen
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {currentAccObj?.status || "ACTIVE"}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-mono text-slate-600 font-bold">
                Compliance Legal Narrative / Reason:
              </label>
              <input
                type="text"
                placeholder="e.g. Intercepted structured smurfing trail to offshore destination..."
                value={officerReason}
                onChange={(e) => setOfficerReason(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 font-mono"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {isTargetFrozen ? (
                <button
                  onClick={handleOfficerUnfreeze}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Unfreeze & Restore Account to ACTIVE</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleOfficerFreeze}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <ShieldBan className="w-3.5 h-3.5" />
                    <span>Freeze Target Only</span>
                  </button>

                  <button
                    onClick={handleOfficerCascadeFreeze}
                    className="flex-1 bg-rose-800 hover:bg-rose-900 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    title="Freezes target AND all downstream shells and sinks across the full transaction chain"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-white" />
                    <span>🚨 Cascade Freeze</span>
                  </button>
                </>
              )}

              <button
                onClick={handleOfficerFileSar}
                className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>File Standalone Statutory SAR</span>
              </button>
            </div>
          </div>

          {/* Card C: Live Forensic Agent Terminal */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col h-[400px] shadow-xs flex-1">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-600" />
                <span>Forensic Stream & SAR Narrative</span>
              </h2>

              {verdict && (
                <button
                  onClick={copyVerdict}
                  className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition cursor-pointer font-semibold"
                  title="Copy log to clipboard"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-lg p-3.5 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner mt-2.5">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 animate-pulse py-8">
                  <CheckCircle2 className="w-7 h-7 text-indigo-400 animate-spin" />
                  <span className="font-semibold text-xs text-white">Traversing FastMCP JSON-RPC Pipeline...</span>
                  <span className="text-[10px] text-slate-400 font-mono">Running recursive SQL CTE & verifying FinCEN CTR rules</span>
                </div>
              ) : verdict ? (
                verdict
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-4 gap-1.5">
                  <BookOpen className="w-7 h-7 text-slate-500 mb-1" />
                  <p className="text-xs text-slate-200 font-semibold">Forensic Sandbox Ready</p>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    Select an account and click <strong className="text-indigo-400">Initiate Triage</strong> to run the autonomous forensic loop.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span className="text-slate-500">FastMCP Protocol: Active</span>
              <span className="text-indigo-600 font-semibold">Two-Phase HITL: Engaged</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
