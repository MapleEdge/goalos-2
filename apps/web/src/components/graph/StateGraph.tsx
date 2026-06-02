'use client'

import {
  Background,
  type Connection,
  Controls,
  type Edge,
  MarkerType,
  type Node,
  type NodeTypes,
  ReactFlow,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
  useOnViewportChange,
  useReactFlow,
  type Viewport,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '@xyflow/react/dist/style.css'
import { ConnectNodesModal } from './ConnectNodesModal'
import { GraphNode } from './GraphNode'
import { NodeCreateModal } from './NodeCreateModal'
import { NodeEditModal } from './NodeEditModal'

function GraphSearch({ nodes }: { nodes: Node[] }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const { setCenter, getNode } = useReactFlow()
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return nodes
      .filter((n) => {
        const d = n.data as {
          label?: string
          nodeType?: string
          subtitle?: string
        }
        return (
          d.label?.toLowerCase().includes(q) ||
          d.nodeType?.toLowerCase().includes(q) ||
          d.subtitle?.toLowerCase().includes(q)
        )
      })
      .slice(0, 12)
  }, [query, nodes])

  const handleSelect = useCallback(
    (nodeId: string) => {
      const node = getNode(nodeId)
      if (node) {
        const x = node.position.x + (node.measured?.width ?? 160) / 2
        const y = node.position.y + (node.measured?.height ?? 60) / 2
        setCenter(x, y, { zoom: 1.2, duration: 600 })
      }
      setQuery('')
      setOpen(false)
    },
    [getNode, setCenter]
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as HTMLElement)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className="absolute top-4 left-4 z-10 w-72">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => query.trim() && setOpen(true)}
        placeholder="Search nodes…"
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-400 focus:outline-none"
      />
      {open && suggestions.length > 0 && (
        <ul className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
          {suggestions.map((node) => {
            const d = node.data as {
              label?: string
              nodeType?: string
              color?: string
            }
            return (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(node.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: d.color || '#94a3b8' }}
                  />
                  <span className="truncate font-medium text-zinc-800">
                    {d.label}
                  </span>
                  <span className="ml-auto shrink-0 text-[10px] uppercase text-zinc-400">
                    {d.nodeType}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

interface GoalData {
  id: string
  title: string
  status: string
  prerequisites: {
    id: string
    title: string
    status: string
    evidence: { id: string; title: string }[]
  }[]
  actions: { id: string; title: string; status: string }[]
}

interface StakeholderData {
  id: string
  name: string
  organization: string | null
}

interface VehicleData {
  id: string
  title: string
  type: string
  status: string
  vehicleGoals: { goalId: string; leverage: string | null }[]
  controlDimensions: {
    id: string
    name: string
    value: number
    icon: string | null
    color: string | null
  }[]
}

interface ResourceFlowData {
  id: string
  label: string
  direction: string
  amount: number
  entityType: string
  entityId: string
  resourceType: {
    id: string
    name: string
    icon: string | null
    color: string | null
  }
}

interface ResourceTypeData {
  id: string
  name: string
  icon: string | null
  color: string | null
}

interface RelationshipData {
  id: string
  fromType: string
  fromId: string
  toType: string
  toId: string
  label: string | null
}

const nodeTypes: NodeTypes = {
  graphNode: GraphNode,
}

const typeColors: Record<string, string> = {
  GOAL: '#10b981',
  PREREQUISITE: '#f59e0b',
  EVIDENCE: '#3b82f6',
  ACTION: '#8b5cf6',
  STAKEHOLDER: '#ec4899',
  VEHICLE: '#06b6d4',
  RESOURCE_TYPE: '#f97316',
  RESOURCE_FLOW: '#64748b',
  CONTROL_DIM: '#14b8a6',
}

const STAKEHOLDER_COLS = 4
const STAKEHOLDER_COL_W = 210
const STAKEHOLDER_ROW_H = 90
const STAKEHOLDER_COMPACT_THRESHOLD = 6

const VIEWPORT_STORAGE_KEY = 'goalos-graph-viewport'
const LAYOUT_STORAGE_KEY = 'goalos-graph-layout'

type LayoutMode = 'freeform' | 'column'

const COLUMN_ORDER: string[] = [
  'ACTION',
  'GOAL',
  'PREREQUISITE',
  'EVIDENCE',
  'VEHICLE',
  'CONTROL',
  'STAKEHOLDER',
  'RESOURCE',
]
const COLUMN_WIDTH = 280
const COLUMN_NODE_GAP = 85
const COLUMN_HEADER_Y = 0
const COLUMN_START_Y = 50

function saveLayout(mode: LayoutMode) {
  try {
    sessionStorage.setItem(LAYOUT_STORAGE_KEY, mode)
  } catch {
    // sessionStorage unavailable
  }
}

function loadLayout(): LayoutMode {
  try {
    const raw = sessionStorage.getItem(LAYOUT_STORAGE_KEY)
    if (raw === 'column' || raw === 'freeform') return raw
  } catch {
    // ignore
  }
  return 'freeform'
}

function saveViewport(viewport: Viewport) {
  try {
    sessionStorage.setItem(VIEWPORT_STORAGE_KEY, JSON.stringify(viewport))
  } catch {
    // sessionStorage unavailable
  }
}

function loadViewport(): Viewport | null {
  try {
    const raw = sessionStorage.getItem(VIEWPORT_STORAGE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Viewport
    if (
      typeof v.x === 'number' &&
      typeof v.y === 'number' &&
      typeof v.zoom === 'number'
    ) {
      return v
    }
  } catch {
    // ignore
  }
  return null
}

function ViewportPersistence() {
  useOnViewportChange({
    onChange: (viewport: Viewport) => {
      saveViewport(viewport)
    },
  })
  return null
}

export function StateGraph() {
  const [goals, setGoals] = useState<GoalData[]>([])
  const [stakeholders, setStakeholders] = useState<StakeholderData[]>([])
  const [vehicles, setVehicles] = useState<VehicleData[]>([])
  const [flows, setFlows] = useState<ResourceFlowData[]>([])
  const [resourceTypes, setResourceTypes] = useState<ResourceTypeData[]>([])
  const [relationships, setRelationships] = useState<RelationshipData[]>([])
  const [loading, setLoading] = useState(true)
  const [showAllStakeholders, setShowAllStakeholders] = useState(false)
  const [editNode, setEditNode] = useState<{ id: string; type: string } | null>(
    null
  )
  const [showCreate, setShowCreate] = useState(false)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('freeform')

  // Load persisted layout on mount
  useEffect(() => {
    setLayoutMode(loadLayout())
  }, [])

  const toggleLayout = useCallback(() => {
    setLayoutMode((prev) => {
      const next = prev === 'freeform' ? 'column' : 'freeform'
      saveLayout(next)
      return next
    })
  }, [])
  const [pendingConnection, setPendingConnection] = useState<{
    fromId: string
    fromLabel: string
    fromType: string
    toId: string
    toLabel: string
    toType: string
  } | null>(null)
  const hasRestoredViewport = useRef(false)
  const rfInstance = useRef<ReactFlowInstance | null>(null)

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    rfInstance.current = instance
    const saved = loadViewport()
    if (saved && !hasRestoredViewport.current) {
      instance.setViewport(saved)
      hasRestoredViewport.current = true
    } else {
      instance.fitView()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [
        goalsRes,
        stakeholdersRes,
        relsRes,
        vehiclesRes,
        flowsRes,
        typesRes,
      ] = await Promise.all([
        fetch('/api/goals'),
        fetch('/api/stakeholders'),
        fetch('/api/relationships'),
        fetch('/api/vehicles'),
        fetch('/api/resource-flows?activeOnly=false'),
        fetch('/api/resource-types'),
      ])
      const [g, s, r, v, f, t] = await Promise.all([
        goalsRes.json(),
        stakeholdersRes.json(),
        relsRes.json(),
        vehiclesRes.json(),
        flowsRes.json(),
        typesRes.json(),
      ])
      if (!cancelled) {
        setGoals(g)
        setStakeholders(s)
        setRelationships(r)
        setVehicles(v)
        setFlows(f)
        setResourceTypes(t)
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []
    let yGoal = 0

    // ── Goals + prerequisites + evidence + actions ──
    for (const goal of goals) {
      const goalX = 0
      const goalY = yGoal

      nodes.push({
        id: goal.id,
        type: 'graphNode',
        position: { x: goalX, y: goalY },
        data: {
          label: goal.title,
          nodeType: 'GOAL',
          status: goal.status,
          color: typeColors.GOAL,
        },
      })

      let prereqY = goalY - (goal.prerequisites.length * 80) / 2
      for (const prereq of goal.prerequisites) {
        nodes.push({
          id: prereq.id,
          type: 'graphNode',
          position: { x: goalX + 300, y: prereqY },
          data: {
            label: prereq.title,
            nodeType: 'PREREQUISITE',
            status: prereq.status,
            color: typeColors.PREREQUISITE,
          },
        })
        edges.push({
          id: `${goal.id}-${prereq.id}`,
          source: goal.id,
          target: prereq.id,
          label: 'requires',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: typeColors.PREREQUISITE },
        })

        let evY = prereqY - (prereq.evidence.length * 60) / 2
        for (const ev of prereq.evidence) {
          nodes.push({
            id: ev.id,
            type: 'graphNode',
            position: { x: goalX + 600, y: evY },
            data: {
              label: ev.title,
              nodeType: 'EVIDENCE',
              color: typeColors.EVIDENCE,
            },
          })
          edges.push({
            id: `${prereq.id}-${ev.id}`,
            source: prereq.id,
            target: ev.id,
            label: 'evidenced by',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: typeColors.EVIDENCE },
          })
          evY += 70
        }
        prereqY += 90
      }

      let actionY = goalY
      for (const action of goal.actions) {
        nodes.push({
          id: action.id,
          type: 'graphNode',
          position: { x: goalX - 300, y: actionY },
          data: {
            label: action.title,
            nodeType: 'ACTION',
            status: action.status,
            color: typeColors.ACTION,
          },
        })
        edges.push({
          id: `${goal.id}-${action.id}`,
          source: goal.id,
          target: action.id,
          label: 'action',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: typeColors.ACTION },
        })
        actionY += 80
      }

      yGoal += Math.max(
        goal.prerequisites.length * 90,
        goal.actions.length * 80,
        200
      )
    }

    // ── Vehicles ──
    const vehicleStartX = -700
    let vehicleY = 0
    const goalIdSet = new Set(goals.map((g) => g.id))

    for (const veh of vehicles) {
      nodes.push({
        id: veh.id,
        type: 'graphNode',
        position: { x: vehicleStartX, y: vehicleY },
        data: {
          label: veh.title,
          nodeType: 'VEHICLE',
          status: veh.status,
          color: typeColors.VEHICLE,
          subtitle: veh.type.replace(/_/g, ' '),
        },
      })

      // Vehicle → Goal edges via vehicleGoals
      for (const vg of veh.vehicleGoals) {
        if (goalIdSet.has(vg.goalId)) {
          edges.push({
            id: `vg-${veh.id}-${vg.goalId}`,
            source: veh.id,
            target: vg.goalId,
            label: vg.leverage || 'accelerates',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: typeColors.VEHICLE, strokeDasharray: '6 3' },
          })
        }
      }

      // Control dimension sub-nodes
      if (veh.controlDimensions.length > 0) {
        let dimY = vehicleY - (veh.controlDimensions.length * 60) / 2
        for (const dim of veh.controlDimensions) {
          const dimNodeId = `ctrl-${dim.id}`
          nodes.push({
            id: dimNodeId,
            type: 'graphNode',
            position: { x: vehicleStartX - 280, y: dimY },
            data: {
              label: `${dim.name}: ${Math.round(dim.value)}%`,
              nodeType: 'CONTROL',
              icon: dim.icon || 'BarChart3',
              color: dim.color || typeColors.CONTROL_DIM,
            },
          })
          edges.push({
            id: `ctrl-edge-${dim.id}`,
            source: veh.id,
            target: dimNodeId,
            label: `${Math.round(dim.value)}%`,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: dim.color || typeColors.CONTROL_DIM },
          })
          dimY += 65
        }
      }

      vehicleY += Math.max(veh.controlDimensions.length * 65, 120)
    }

    // ── Stakeholders (grid layout, right side) ──
    const connectedStakeholderIds = new Set(
      relationships
        .filter(
          (r) => r.fromType === 'STAKEHOLDER' || r.toType === 'STAKEHOLDER'
        )
        .flatMap((r) => [r.fromId, r.toId])
    )
    const connectedStakeholders = stakeholders.filter((s) =>
      connectedStakeholderIds.has(s.id)
    )
    const unconnectedStakeholders = stakeholders.filter(
      (s) => !connectedStakeholderIds.has(s.id)
    )

    const useCompact = stakeholders.length > STAKEHOLDER_COMPACT_THRESHOLD
    const visibleStakeholders =
      useCompact && !showAllStakeholders ? connectedStakeholders : stakeholders

    for (let i = 0; i < visibleStakeholders.length; i++) {
      const s = visibleStakeholders[i]!
      const col = i % STAKEHOLDER_COLS
      const row = Math.floor(i / STAKEHOLDER_COLS)
      nodes.push({
        id: s.id,
        type: 'graphNode',
        position: {
          x: 900 + col * STAKEHOLDER_COL_W,
          y: row * STAKEHOLDER_ROW_H,
        },
        data: {
          label: s.name,
          nodeType: 'STAKEHOLDER',
          subtitle: s.organization,
          color: typeColors.STAKEHOLDER,
        },
      })
    }

    if (
      useCompact &&
      !showAllStakeholders &&
      unconnectedStakeholders.length > 0
    ) {
      const summaryRow = Math.ceil(
        connectedStakeholders.length / STAKEHOLDER_COLS
      )
      nodes.push({
        id: '__stakeholder_summary',
        type: 'graphNode',
        position: { x: 900, y: summaryRow * STAKEHOLDER_ROW_H },
        data: {
          label: `+${unconnectedStakeholders.length} more stakeholder${unconnectedStakeholders.length !== 1 ? 's' : ''}`,
          nodeType: 'STAKEHOLDER',
          color: typeColors.STAKEHOLDER,
          isSummary: true,
        },
      })
    }

    // ── Resource Flows → edges between entities ──
    // Group flows by entity to create edges from entity to resource type
    const entityNodeIds = new Set(nodes.map((n) => n.id))
    const rtNodeIds = new Set<string>()

    // Place resource type nodes at bottom
    const rtStartY = Math.max(yGoal, vehicleY) + 150
    let rtX = -300
    for (const rt of resourceTypes) {
      const rtNodeId = `rt-${rt.id}`
      rtNodeIds.add(rtNodeId)
      nodes.push({
        id: rtNodeId,
        type: 'graphNode',
        position: { x: rtX, y: rtStartY },
        data: {
          label: rt.name,
          nodeType: 'RESOURCE',
          icon: rt.icon || 'Gem',
          color: rt.color || typeColors.RESOURCE_TYPE,
        },
      })
      rtX += 220
    }

    // Draw flow edges
    for (const flow of flows) {
      const entityExists = entityNodeIds.has(flow.entityId)
      const rtNodeId = `rt-${flow.resourceType.id}`
      if (entityExists && rtNodeIds.has(rtNodeId)) {
        const isInflow = flow.direction === 'INFLOW'
        edges.push({
          id: `flow-${flow.id}`,
          source: isInflow ? rtNodeId : flow.entityId,
          target: isInflow ? flow.entityId : rtNodeId,
          label: `${flow.label} ($${flow.amount})`,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: {
            stroke: flow.resourceType.color || typeColors.RESOURCE_FLOW,
            strokeDasharray: '4 2',
            opacity: 0.7,
          },
        })
      }
    }

    // ── Explicit relationships ──
    for (const rel of relationships) {
      const sourceExists = nodes.some((n) => n.id === rel.fromId)
      const targetExists = nodes.some((n) => n.id === rel.toId)
      if (sourceExists && targetExists) {
        edges.push({
          id: rel.id,
          source: rel.fromId,
          target: rel.toId,
          label: rel.label || undefined,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#94a3b8', strokeDasharray: '4 2' },
        })
      }
    }

    // ── Column layout: reposition all nodes by type ──
    if (layoutMode === 'column') {
      const typeGroups: Record<string, Node[]> = {}
      for (const node of nodes) {
        const nt = (node.data as { nodeType?: string }).nodeType || 'OTHER'
        if (!typeGroups[nt]) typeGroups[nt] = []
        typeGroups[nt]!.push(node)
      }

      let colX = 0
      for (const type of COLUMN_ORDER) {
        const group = typeGroups[type]
        if (!group || group.length === 0) continue

        // Add a header node for the column
        const headerLabel =
          type === 'CONTROL'
            ? 'Control Dimensions'
            : type === 'RESOURCE'
              ? 'Resource Types'
              : `${type.charAt(0)}${type.slice(1).toLowerCase()}s`
        nodes.push({
          id: `__col_header_${type}`,
          type: 'graphNode',
          position: { x: colX, y: COLUMN_HEADER_Y },
          data: {
            label: headerLabel,
            nodeType: type,
            color:
              typeColors[type] ||
              typeColors[type.replace(/S$/, '')] ||
              '#94a3b8',
            isHeader: true,
          },
          selectable: false,
          draggable: false,
        })

        let rowY = COLUMN_START_Y
        for (const node of group) {
          node.position = { x: colX, y: rowY }
          rowY += COLUMN_NODE_GAP
        }
        colX += COLUMN_WIDTH
      }
    }

    return { initialNodes: nodes, initialEdges: edges }
  }, [
    goals,
    stakeholders,
    vehicles,
    flows,
    resourceTypes,
    relationships,
    showAllStakeholders,
    layoutMode,
  ])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  // Fit view when layout mode changes
  const prevLayout = useRef(layoutMode)
  useEffect(() => {
    if (prevLayout.current !== layoutMode) {
      prevLayout.current = layoutMode
      setTimeout(() => {
        rfInstance.current?.fitView({ duration: 400 })
      }, 50)
    }
  }, [layoutMode])

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.id === '__stakeholder_summary') {
        setShowAllStakeholders(true)
        return
      }
      if (node.id.startsWith('__col_header_')) return
      // Only open edit modal for editable types
      const nodeType = (node.data as { nodeType?: string }).nodeType
      if (
        nodeType &&
        [
          'GOAL',
          'PREREQUISITE',
          'ACTION',
          'EVIDENCE',
          'STAKEHOLDER',
          'VEHICLE',
        ].includes(nodeType)
      ) {
        setEditNode({ id: node.id, type: nodeType })
      }
    },
    []
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source)
      const targetNode = nodes.find((n) => n.id === connection.target)
      if (!sourceNode || !targetNode) return

      const srcData = sourceNode.data as { label?: string; nodeType?: string }
      const tgtData = targetNode.data as { label?: string; nodeType?: string }
      if (!srcData.nodeType || !tgtData.nodeType) return

      setPendingConnection({
        fromId: sourceNode.id,
        fromLabel: srcData.label || sourceNode.id,
        fromType: srcData.nodeType,
        toId: targetNode.id,
        toLabel: tgtData.label || targetNode.id,
        toType: tgtData.nodeType,
      })
    },
    [nodes]
  )

  const reloadData = useCallback(async () => {
    const [
      goalsRes,
      stakeholdersRes,
      relsRes,
      vehiclesRes,
      flowsRes,
      typesRes,
    ] = await Promise.all([
      fetch('/api/goals'),
      fetch('/api/stakeholders'),
      fetch('/api/relationships'),
      fetch('/api/vehicles'),
      fetch('/api/resource-flows?activeOnly=false'),
      fetch('/api/resource-types'),
    ])
    const [g, s, r, v, f, t] = await Promise.all([
      goalsRes.json(),
      stakeholdersRes.json(),
      relsRes.json(),
      vehiclesRes.json(),
      flowsRes.json(),
      typesRes.json(),
    ])
    setGoals(g)
    setStakeholders(s)
    setRelationships(r)
    setVehicles(v)
    setFlows(f)
    setResourceTypes(t)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-800" />
      </div>
    )
  }

  if (
    goals.length === 0 &&
    stakeholders.length === 0 &&
    vehicles.length === 0
  ) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-700 mb-2">
            No data to visualize
          </h2>
          <p className="text-sm text-zinc-500">
            Create goals, stakeholders, and vehicles to see your state graph.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-56px)] relative">
      <ReactFlow
        nodes={nodes}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        onInit={handleInit}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e4e4e7" gap={20} />
        <Controls />
        <ViewportPersistence />
        <GraphSearch nodes={nodes} />
      </ReactFlow>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleLayout}
          className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm border border-zinc-200 hover:bg-zinc-50"
        >
          {layoutMode === 'freeform' ? (
            <>
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 4h6m-6 4h6m-6 4h6m-6 4h6M4 4v16"
                />
              </svg>
              Column View
            </>
          ) : (
            <>
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              Free-form View
            </>
          )}
        </button>
        {stakeholders.length > STAKEHOLDER_COMPACT_THRESHOLD && (
          <button
            type="button"
            onClick={() => setShowAllStakeholders((v) => !v)}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm border border-zinc-200 hover:bg-zinc-50"
          >
            {showAllStakeholders
              ? 'Hide unlinked stakeholders'
              : `Show all ${stakeholders.length} stakeholders`}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="absolute top-4 left-80 z-10 flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-zinc-800"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
        New Node
      </button>

      {showCreate && (
        <NodeCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            reloadData()
          }}
        />
      )}

      {pendingConnection && (
        <ConnectNodesModal
          fromId={pendingConnection.fromId}
          fromLabel={pendingConnection.fromLabel}
          fromType={pendingConnection.fromType}
          toId={pendingConnection.toId}
          toLabel={pendingConnection.toLabel}
          toType={pendingConnection.toType}
          onClose={() => setPendingConnection(null)}
          onCreated={() => {
            setPendingConnection(null)
            reloadData()
          }}
        />
      )}

      {editNode && (
        <NodeEditModal
          nodeId={editNode.id}
          nodeType={
            editNode.type as
              | 'GOAL'
              | 'PREREQUISITE'
              | 'ACTION'
              | 'EVIDENCE'
              | 'STAKEHOLDER'
              | 'VEHICLE'
          }
          onClose={() => setEditNode(null)}
          onSaved={reloadData}
        />
      )}

      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 rounded-lg bg-white/90 p-2 shadow-sm backdrop-blur-sm max-w-md">
        {Object.entries(typeColors).map(([type, color]) => (
          <div
            key={type}
            className="flex items-center gap-1.5 text-xs text-zinc-600"
          >
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            {type.replace(/_/g, ' ').charAt(0) +
              type.replace(/_/g, ' ').slice(1).toLowerCase()}
          </div>
        ))}
      </div>
    </div>
  )
}
