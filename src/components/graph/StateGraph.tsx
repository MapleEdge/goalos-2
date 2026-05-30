"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GraphNode } from "./GraphNode";

interface GoalData {
  id: string;
  title: string;
  status: string;
  prerequisites: { id: string; title: string; status: string; evidence: { id: string; title: string }[] }[];
  actions: { id: string; title: string; status: string }[];
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

export function StateGraph() {
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [stakeholders, setStakeholders] = useState<StakeholderData[]>([]);
  const [relationships, setRelationships] = useState<RelationshipData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
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
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let yGoal = 0;

    for (const goal of goals) {
      const goalX = 0;
      const goalY = yGoal;

      nodes.push({
        id: goal.id,
        type: "graphNode",
        position: { x: goalX, y: goalY },
        data: {
          label: goal.title,
          nodeType: "GOAL",
          status: goal.status,
          color: typeColors.GOAL,
        },
      });

      let prereqY = goalY - (goal.prerequisites.length * 80) / 2;
      for (const prereq of goal.prerequisites) {
        nodes.push({
          id: prereq.id,
          type: "graphNode",
          position: { x: goalX + 300, y: prereqY },
          data: {
            label: prereq.title,
            nodeType: "PREREQUISITE",
            status: prereq.status,
            color: typeColors.PREREQUISITE,
          },
        });
        edges.push({
          id: `${goal.id}-${prereq.id}`,
          source: goal.id,
          target: prereq.id,
          label: "requires",
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: typeColors.PREREQUISITE },
        });

        let evY = prereqY - (prereq.evidence.length * 60) / 2;
        for (const ev of prereq.evidence) {
          nodes.push({
            id: ev.id,
            type: "graphNode",
            position: { x: goalX + 600, y: evY },
            data: {
              label: ev.title,
              nodeType: "EVIDENCE",
              color: typeColors.EVIDENCE,
            },
          });
          edges.push({
            id: `${prereq.id}-${ev.id}`,
            source: prereq.id,
            target: ev.id,
            label: "evidenced by",
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: typeColors.EVIDENCE },
          });
          evY += 70;
        }
        prereqY += 90;
      }

      let actionY = goalY;
      for (const action of goal.actions) {
        nodes.push({
          id: action.id,
          type: "graphNode",
          position: { x: goalX - 300, y: actionY },
          data: {
            label: action.title,
            nodeType: "ACTION",
            status: action.status,
            color: typeColors.ACTION,
          },
        });
        edges.push({
          id: `${goal.id}-${action.id}`,
          source: goal.id,
          target: action.id,
          label: "action",
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: typeColors.ACTION },
        });
        actionY += 80;
      }

      yGoal += Math.max(
        goal.prerequisites.length * 90,
        goal.actions.length * 80,
        200
      );
    }

    let stakeholderY = 0;
    for (const s of stakeholders) {
      nodes.push({
        id: s.id,
        type: "graphNode",
        position: { x: 900, y: stakeholderY },
        data: {
          label: s.name,
          nodeType: "STAKEHOLDER",
          subtitle: s.organization,
          color: typeColors.STAKEHOLDER,
        },
      });
      stakeholderY += 100;
    }

    for (const rel of relationships) {
      const sourceExists = nodes.some((n) => n.id === rel.fromId);
      const targetExists = nodes.some((n) => n.id === rel.toId);
      if (sourceExists && targetExists) {
        edges.push({
          id: rel.id,
          source: rel.fromId,
          target: rel.toId,
          label: rel.label || undefined,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: "#94a3b8", strokeDasharray: "4 2" },
        });
      }
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [goals, stakeholders, relationships]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-800" />
      </div>
    );
  }

  if (goals.length === 0 && stakeholders.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-700 mb-2">
            No data to visualize
          </h2>
          <p className="text-sm text-zinc-500">
            Create goals and stakeholders to see your state graph.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)]">
      <ReactFlow
        nodes={nodes}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e4e4e7" gap={20} />
        <Controls />
      </ReactFlow>

      <div className="absolute bottom-4 left-4 flex gap-2 rounded-lg bg-white/90 p-2 shadow-sm backdrop-blur-sm">
        {Object.entries(typeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-zinc-600">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            {type.charAt(0) + type.slice(1).toLowerCase()}
          </div>
        ))}
      </div>
    </div>
  );
}
