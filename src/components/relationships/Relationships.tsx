"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GraphNode } from "@/components/graph/GraphNode";
import { RelationshipImprove } from "./RelationshipImprove";

interface GoalData {
  id: string;
  title: string;
  status: string;
  prerequisites: { id: string; title: string; evidence: { id: string; title: string }[] }[];
  actions: { id: string; title: string }[];
}

interface StakeholderData {
  id: string;
  name: string;
  organization: string | null;
}

interface RelationshipData {
  id: string;
  fromType: string;
  fromId: string;
  toType: string;
  toId: string;
  label: string | null;
  weight: number;
  createdAt: string;
}

interface NodeMeta {
  label: string;
  type: string;
  subtitle?: string | null;
}

const nodeTypes: NodeTypes = {
  graphNode: GraphNode,
};

const typeColors: Record<string, string> = {
  GOAL: "#10b981",
  PREREQUISITE: "#f59e0b",
  EVIDENCE: "#3b82f6",
  ACTION: "#8b5cf6",
  STAKEHOLDER: "#ec4899",
};

const TYPE_ORDER = ["STAKEHOLDER", "GOAL", "PREREQUISITE", "ACTION", "EVIDENCE"];
const COL_W = 240;
const ROW_H = 90;
// Wrap each type group into a grid once it exceeds MAX_ROWS so large
// same-type networks (e.g. many stakeholders) stay readable instead of
// collapsing into one extremely tall column.
const MAX_ROWS = 12;
const TYPE_GAP = 140;

function typeLabel(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

export function Relationships() {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [stakeholders, setStakeholders] = useState<StakeholderData[]>([]);
  const [relationships, setRelationships] = useState<RelationshipData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"improve" | "graph" | "table">("improve");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [goalsRes, stakeholdersRes, relsRes] = await Promise.all([
          fetch("/api/goals"),
          fetch("/api/stakeholders"),
          fetch("/api/relationships"),
        ]);
        const [g, s, r] = await Promise.all([
          goalsRes.json(),
          stakeholdersRes.json(),
          relsRes.json(),
        ]);
        if (!cancelled) {
          setGoals(g);
          setStakeholders(s);
          setRelationships(r);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Map every entity id -> { label, type } so relationship endpoints can be
  // resolved to human-readable names regardless of node type.
  const nodeMeta = useMemo(() => {
    const map = new Map<string, NodeMeta>();
    for (const goal of goals) {
      map.set(goal.id, { label: goal.title, type: "GOAL" });
      for (const prereq of goal.prerequisites) {
        map.set(prereq.id, { label: prereq.title, type: "PREREQUISITE" });
        for (const ev of prereq.evidence) {
          map.set(ev.id, { label: ev.title, type: "EVIDENCE" });
        }
      }
      for (const action of goal.actions) {
        map.set(action.id, { label: action.title, type: "ACTION" });
      }
    }
    for (const s of stakeholders) {
      map.set(s.id, { label: s.name, type: "STAKEHOLDER", subtitle: s.organization });
    }
    return map;
  }, [goals, stakeholders]);

  const { nodes, edges } = useMemo(() => {
    // Only render entities that participate in at least one relationship.
    const involved = new Set<string>();
    for (const rel of relationships) {
      involved.add(rel.fromId);
      involved.add(rel.toId);
    }

    const byType = new Map<string, string[]>();
    for (const id of involved) {
      const meta = nodeMeta.get(id);
      const type = meta?.type ?? "GOAL";
      const list = byType.get(type) ?? [];
      list.push(id);
      byType.set(type, list);
    }

    const graphNodes: Node[] = [];
    let xCursor = 0;
    TYPE_ORDER.forEach((type) => {
      const ids = byType.get(type) ?? [];
      if (ids.length === 0) return;
      const colCount = Math.ceil(ids.length / MAX_ROWS);
      ids.forEach((id, i) => {
        const col = Math.floor(i / MAX_ROWS);
        const row = i % MAX_ROWS;
        const meta = nodeMeta.get(id);
        graphNodes.push({
          id,
          type: "graphNode",
          position: { x: xCursor + col * COL_W, y: row * ROW_H },
          data: {
            label: meta?.label ?? "Unknown",
            nodeType: type,
            subtitle: meta?.subtitle ?? undefined,
            color: typeColors[type] ?? "#94a3b8",
          },
        });
      });
      xCursor += colCount * COL_W + TYPE_GAP;
    });

    const graphEdges: Edge[] = relationships
      .filter((rel) => involved.has(rel.fromId) && involved.has(rel.toId))
      .map((rel) => ({
        id: rel.id,
        source: rel.fromId,
        target: rel.toId,
        label: rel.label || undefined,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "#94a3b8" },
        labelStyle: { fontSize: 11, fill: "#52525b" },
        labelBgStyle: { fill: "#ffffff" },
      }));

    return { nodes: graphNodes, edges: graphEdges };
  }, [relationships, nodeMeta]);

  const tableRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = relationships.map((rel) => {
      const from = nodeMeta.get(rel.fromId);
      const to = nodeMeta.get(rel.toId);
      return {
        id: rel.id,
        fromLabel: from?.label ?? rel.fromId,
        fromType: from?.type ?? rel.fromType,
        toLabel: to?.label ?? rel.toId,
        toType: to?.type ?? rel.toType,
        label: rel.label ?? "—",
        weight: rel.weight,
        createdAt: rel.createdAt,
      };
    });
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.fromLabel.toLowerCase().includes(q) ||
        r.toLabel.toLowerCase().includes(q) ||
        r.label.toLowerCase().includes(q)
    );
  }, [relationships, nodeMeta, query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-800" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Relationships
          </h1>
          <p className="text-sm text-zinc-500">
            {view === "improve"
              ? "Prioritized actions to strengthen the relationships that matter"
              : `${relationships.length} relationship${relationships.length !== 1 ? "s" : ""} across your goals and stakeholders`}
          </p>
        </div>
        <div className="flex rounded-lg border border-zinc-200 overflow-hidden">
          {(["improve", "graph", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                view === v
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "improve" ? (
        <RelationshipImprove />
      ) : relationships.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-20 text-center">
          <h2 className="text-lg font-semibold text-zinc-700">No relationships yet</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Connect stakeholders and goals on the{" "}
            <a href="/graph" className="text-blue-600 underline">
              Graph
            </a>{" "}
            page to map your relationships.
          </p>
        </div>
      ) : view === "graph" ? (
        <div className="relative h-[calc(100vh-180px)] rounded-xl border border-zinc-200 bg-white">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#e4e4e7" gap={20} />
            <Controls />
          </ReactFlow>
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 rounded-lg bg-white/90 p-2 shadow-sm backdrop-blur-sm">
            {TYPE_ORDER.map((type) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-zinc-600">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: typeColors[type] }}
                />
                {typeLabel(type)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 p-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or label…"
              className="w-full max-w-xs rounded-md border border-zinc-200 px-3 py-1.5 text-sm focus:border-zinc-400 focus:outline-none"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-400">
                  <th className="px-4 py-2 font-medium">From</th>
                  <th className="px-4 py-2 font-medium">Relationship</th>
                  <th className="px-4 py-2 font-medium">To</th>
                  <th className="px-4 py-2 font-medium">Weight</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <TypeBadge type={row.fromType} />
                        <span className="text-zinc-900">{row.fromLabel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600">{row.label}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <TypeBadge type={row.toType} />
                        <span className="text-zinc-900">{row.toLabel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600">{row.weight.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-zinc-500">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {tableRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">
                      No relationships match &quot;{query}&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const color = typeColors[type] ?? "#94a3b8";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {typeLabel(type)}
    </span>
  );
}
