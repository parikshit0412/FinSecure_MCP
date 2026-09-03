"use client";

import React, { useState, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Node,
  Edge,
  Handle,
  Position,
  BackgroundVariant
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ShieldCheck,
  Building2,
  Lock,
  Landmark,
  User,
  Filter,
  Layers,
  Crosshair,
  AlertTriangle,
  Radio,
  Eye
} from "lucide-react";

interface Account {
  id: string;
  holder_name: string;
  risk_score: number;
  status: string;
  is_pep: boolean;
}

interface Transaction {
  id: number | string;
  source_account: string;
  destination_account: string;
  amount: number;
  timestamp?: string;
}

interface FlowVisualizerProps {
  accounts: Account[];
  transactions: Transaction[];
  highlightAccount?: string;
}

type GraphFilter = "focus" | "fraud" | "structuring" | "all";

// Executive Fintech Clean Entity Card (Stripe / Mercury Bank / Brex Aesthetic)
function ForensicEntityNode({ data }: { data: any }) {
  const { acc, isTarget, isClean, isShell, isSink, inboundTotal, outboundTotal } = data;
  const isFrozen = acc.status === "FROZEN";

  // Tier Classification & Iconography
  let archetypeLabel = "COMMERCIAL ENTITY";
  let ArchetypeIcon = Building2;
  let iconBg = "bg-slate-100 text-slate-700";
  let badgeBorder = "border-slate-200";
  let badgeBg = "bg-slate-50 text-slate-600";

  if (isClean) {
    archetypeLabel = "VERIFIED COMMERCE";
    ArchetypeIcon = ShieldCheck;
    iconBg = "bg-emerald-50 text-emerald-700";
    badgeBorder = "border-emerald-200";
    badgeBg = "bg-emerald-50 text-emerald-700";
  } else if (isShell) {
    archetypeLabel = "INTERMEDIARY SHELL";
    ArchetypeIcon = Building2;
    iconBg = "bg-purple-50 text-purple-700";
    badgeBorder = "border-purple-200";
    badgeBg = "bg-purple-50 text-purple-700";
  } else if (isSink) {
    archetypeLabel = "DESTINATION SINK";
    ArchetypeIcon = Landmark;
    iconBg = "bg-rose-50 text-rose-700";
    badgeBorder = "border-rose-200";
    badgeBg = "bg-rose-50 text-rose-700";
  } else if (acc.is_pep) {
    archetypeLabel = "PEP ORIGINATOR";
    ArchetypeIcon = User;
    iconBg = "bg-indigo-50 text-indigo-700";
    badgeBorder = "border-indigo-200";
    badgeBg = "bg-indigo-50 text-indigo-700";
  }

  return (
    <div
      className={`relative w-[260px] rounded-xl font-sans transition-all duration-300 select-none ${
        isFrozen
          ? "bg-rose-50/40 border-2 border-rose-500 shadow-lg ring-2 ring-rose-100"
          : isTarget
          ? "bg-white border-2 border-indigo-600 shadow-xl ring-4 ring-indigo-50"
          : "bg-white border border-slate-200/90 shadow-sm hover:shadow-md"
      }`}
    >
      {/* Target Indicator Pill */}
      {isTarget && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md z-20">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>Active Target</span>
        </div>
      )}

      {/* Target Handles for Connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-slate-300 !border-2 !border-white rounded-full hover:!bg-indigo-600 !-left-1"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-slate-300 !border-2 !border-white rounded-full hover:!bg-indigo-600 !-right-1"
      />

      {/* Card Header */}
      <div
        className={`px-3.5 py-2.5 border-b flex items-center justify-between rounded-t-xl ${
          isFrozen
            ? "bg-rose-100/50 border-rose-200"
            : isTarget
            ? "bg-indigo-50/70 border-indigo-100"
            : "bg-slate-50/80 border-slate-100"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded-md ${iconBg}`}>
            <ArchetypeIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-mono font-bold tracking-wider text-slate-900">
            {acc.id}
          </span>
        </div>

        {/* Status Chip */}
        <div className="flex items-center gap-1">
          {acc.is_pep && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
              PEP
            </span>
          )}
          {isFrozen ? (
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-rose-600 text-white flex items-center gap-1 shadow-sm">
              <Lock className="w-2.5 h-2.5" /> FROZEN
            </span>
          ) : (
            <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded border ${badgeBg} ${badgeBorder}`}>
              ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex flex-col gap-2.5">
        {/* Holder Name & Archetype */}
        <div>
          <div className="text-xs font-bold text-slate-900 truncate" title={acc.holder_name}>
            {acc.holder_name}
          </div>
          <div className="text-[9px] font-mono tracking-wider uppercase text-slate-500 mt-0.5 font-medium">
            {archetypeLabel}
          </div>
        </div>

        {/* Risk Score Progress Bar */}
        <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-100">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-500 font-medium">Risk Score:</span>
            <span
              className={`font-bold ${
                acc.risk_score >= 80
                  ? "text-rose-600 font-extrabold"
                  : acc.risk_score >= 50
                  ? "text-amber-600"
                  : "text-emerald-700"
              }`}
            >
              {acc.risk_score} / 100
            </span>
          </div>

          {/* Micro Visual Meter */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                acc.risk_score >= 80
                  ? "bg-rose-500"
                  : acc.risk_score >= 50
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(5, acc.risk_score))}%` }}
            />
          </div>
        </div>

        {/* Inflow / Outflow Telemetry Bar */}
        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 text-[10px] font-mono">
          <div className="bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 flex flex-col">
            <span className="text-[8px] text-slate-500 uppercase font-semibold">Inflow</span>
            <span className="font-bold text-emerald-700 truncate">
              +${inboundTotal.toLocaleString()}
            </span>
          </div>
          <div className="bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 flex flex-col">
            <span className="text-[8px] text-slate-500 uppercase font-semibold">Outflow</span>
            <span className="font-bold text-slate-700 truncate">
              -${outboundTotal.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  forensicNode: ForensicEntityNode,
};

export default function FlowVisualizer({
  accounts,
  transactions,
  highlightAccount = "ACC-KYC-001",
}: FlowVisualizerProps) {
  const [filterMode, setFilterMode] = useState<GraphFilter>("focus");
  const [singleAccountFilter, setSingleAccountFilter] = useState<string>("ALL");

  const accountVolumes = useMemo(() => {
    const map: Record<string, { inbound: number; outbound: number }> = {};
    for (const acc of accounts) {
      map[acc.id] = { inbound: 0, outbound: 0 };
    }
    for (const tx of transactions) {
      if (map[tx.source_account]) {
        map[tx.source_account].outbound += Number(tx.amount || 0);
      }
      if (map[tx.destination_account]) {
        map[tx.destination_account].inbound += Number(tx.amount || 0);
      }
    }
    return map;
  }, [accounts, transactions]);

  const { filteredAccounts, filteredTransactions } = useMemo(() => {
    let txs = [...transactions];
    let accs = [...accounts];

    if (filterMode === "focus") {
      const connectedSet = new Set<string>([highlightAccount]);

      for (const t of transactions) {
        if (t.source_account === highlightAccount) connectedSet.add(t.destination_account);
        if (t.destination_account === highlightAccount) connectedSet.add(t.source_account);
      }

      for (const t of transactions) {
        if (connectedSet.has(t.source_account)) connectedSet.add(t.destination_account);
        if (connectedSet.has(t.destination_account)) connectedSet.add(t.source_account);
      }

      txs = transactions.filter(
        (t) => connectedSet.has(t.source_account) && connectedSet.has(t.destination_account)
      );
      accs = accounts.filter((a) => connectedSet.has(a.id));
    } else if (filterMode === "fraud") {
      accs = accounts.filter((a) => !a.id.includes("CLEAN"));
      const fraudIds = new Set(accs.map((a) => a.id));
      txs = transactions.filter(
        (t) => fraudIds.has(t.source_account) && fraudIds.has(t.destination_account)
      );
    } else if (filterMode === "structuring") {
      txs = transactions.filter(
        (t) => Number(t.amount) >= 9000 && Number(t.amount) <= 9999
      );
      const structIds = new Set<string>();
      for (const t of txs) {
        structIds.add(t.source_account);
        structIds.add(t.destination_account);
      }
      accs = accounts.filter((a) => structIds.has(a.id));
    }

    if (singleAccountFilter !== "ALL") {
      txs = txs.filter(
        (t) =>
          t.source_account === singleAccountFilter ||
          t.destination_account === singleAccountFilter
      );
      const singleSet = new Set<string>([singleAccountFilter]);
      for (const t of txs) {
        singleSet.add(t.source_account);
        singleSet.add(t.destination_account);
      }
      accs = accs.filter((a) => singleSet.has(a.id));
    }

    return { filteredAccounts: accs, filteredTransactions: txs };
  }, [accounts, transactions, highlightAccount, filterMode, singleAccountFilter]);

  const nodes: Node[] = useMemo(() => {
    const colX = {
      origin: 50,
      shell: 480,
      sink: 920,
      clean: 1350,
    };

    let col1Count = 0;
    let col2Count = 0;
    let col3Count = 0;
    let col4Count = 0;

    return filteredAccounts.map((acc) => {
      const isTarget = acc.id === highlightAccount;
      const isClean = acc.id.includes("CLEAN");
      const isShell = acc.id.includes("SHELL") || acc.id.includes("MULE");
      const isSink = acc.id.includes("DEST");

      let pos = { x: colX.origin, y: 30 };

      if (isClean) {
        pos = { x: colX.clean, y: 30 + col4Count * 220 };
        col4Count++;
      } else if (isSink) {
        pos = { x: colX.sink, y: 30 + col3Count * 220 };
        col3Count++;
      } else if (isShell) {
        pos = { x: colX.shell, y: 30 + col2Count * 220 };
        col2Count++;
      } else {
        pos = { x: colX.origin, y: 30 + col1Count * 220 };
        col1Count++;
      }

      const volumes = accountVolumes[acc.id] || { inbound: 0, outbound: 0 };

      return {
        id: acc.id,
        type: "forensicNode",
        position: pos,
        data: {
          acc,
          isTarget,
          isClean,
          isShell,
          isSink,
          inboundTotal: volumes.inbound,
          outboundTotal: volumes.outbound,
        },
      };
    });
  }, [filteredAccounts, highlightAccount, accountVolumes]);

  const edges: Edge[] = useMemo(() => {
    return filteredTransactions.map((tx, idx) => {
      const isStructuring = Number(tx.amount) >= 9000 && Number(tx.amount) <= 9999;
      const strokeColor = isStructuring ? "#4f46e5" : "#94a3b8"; // Indigo for smurfing, Slate-400 for regular

      return {
        id: `e-${tx.id || idx}`,
        source: tx.source_account,
        target: tx.destination_account,
        type: "smoothstep",
        pathOptions: { borderRadius: 16 },
        label: `$${Number(tx.amount).toLocaleString()}`,
        animated: isStructuring,
        zIndex: 1000,
        style: {
          stroke: strokeColor,
          strokeWidth: isStructuring ? 2.5 : 1.5,
        },
        labelStyle: {
          fill: isStructuring ? "#312e81" : "#475569",
          fontSize: 11,
          fontFamily: "monospace",
          fontWeight: "bold",
        },
        labelBgStyle: {
          fill: "#ffffff",
          fillOpacity: 1,
          stroke: isStructuring ? "#4f46e5" : "#cbd5e1",
          strokeWidth: isStructuring ? 2 : 1,
          rx: 6,
          ry: 6,
        },
        labelBgPadding: [8, 4] as [number, number],
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 15,
          height: 15,
        },
      };
    });
  }, [filteredTransactions]);

  return (
    <div className="w-full h-full min-h-[660px] rounded-2xl border border-slate-200 bg-[#f8fafc] overflow-hidden shadow-sm relative flex flex-col">
      {/* Scope Filtration Controls Deck (Executive Clean Header) */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Filter Mode Switches */}
        <div className="bg-white/95 border border-slate-200/90 backdrop-blur-md p-1.5 rounded-xl flex flex-wrap items-center gap-1.5 shadow-md pointer-events-auto">
          <div className="flex items-center gap-1.5 px-2.5 text-[10px] font-mono text-indigo-700 font-bold uppercase border-r border-slate-200">
            <Filter className="w-3.5 h-3.5" />
            <span>Scope Filter:</span>
          </div>

          <button
            onClick={() => setFilterMode("focus")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
              filterMode === "focus"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Shows only target and its 1st/2nd degree connected paths"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>🎯 Focus Target Network</span>
          </button>

          <button
            onClick={() => setFilterMode("fraud")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
              filterMode === "fraud"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Shows only fraud syndicates and shells"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>🚨 Fraud Syndicates Only</span>
          </button>

          <button
            onClick={() => setFilterMode("structuring")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
              filterMode === "structuring"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Shows only $9k–$10k smurfing transfers"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>⚡ Sub-$10k Structuring</span>
          </button>

          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
              filterMode === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title="Displays complete ledger"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>🌐 Full Panorama ({accounts.length})</span>
          </button>
        </div>

        {/* Right: Specific Account Isolation Selector */}
        <div className="bg-white/95 border border-slate-200/90 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-md pointer-events-auto">
          <Eye className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Isolate:</span>
          <select
            value={singleAccountFilter}
            onChange={(e) => setSingleAccountFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="ALL">All Network Accounts</option>
            {accounts.map((a) => (
              <option key={`flt-${a.id}`} value={a.id}>
                {a.id} ({a.holder_name})
              </option>
            ))}
          </select>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold">
            {nodes.length} Nodes / {edges.length} Txs
          </span>
        </div>
      </div>

      {/* Network Topology React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.28 }}
        minZoom={0.2}
        maxZoom={1.6}
      >
        <Background color="#cbd5e1" gap={22} size={1.2} variant={BackgroundVariant.Dots} />
        <Controls className="!bg-white !border-slate-200 !text-slate-700 !rounded-xl shadow-md !bottom-4 !left-4" />
        <MiniMap
          nodeColor={(n) => {
            if (n.id === highlightAccount) return "#4f46e5";
            if (n.id.includes("CLEAN")) return "#10b981";
            if (n.id.includes("SHELL") || n.id.includes("MULE")) return "#8b5cf6";
            return "#f43f5e";
          }}
          maskColor="rgba(248, 250, 252, 0.75)"
          className="!bg-white !border !border-slate-200 !rounded-xl !overflow-hidden !shadow-md !bottom-4 !right-4"
        />
      </ReactFlow>
    </div>
  );
}
