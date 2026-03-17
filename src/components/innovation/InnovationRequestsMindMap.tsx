import { useCallback, useMemo, useState, memo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Maximize2, ChevronRight } from 'lucide-react';
import { STATUS_CONFIG, GROUPING_FIELDS, type InnoRequest, type GroupingField } from './constants';

interface Props {
  requests: InnoRequest[];
  onOpenDetail: (id: string) => void;
}

const CLUSTER_LIMIT = 15;

const GROUP_PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
];

function getFieldValue(req: InnoRequest, field: GroupingField): string {
  if (field === 'status') return STATUS_CONFIG[req.status]?.label || req.status;
  return (req[field] as string) || '(vide)';
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ── Custom Node Components ──

const RootNode = memo(({ data }: { data: any }) => (
  <div
    style={{
      width: 100,
      height: 100,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
      border: '2.5px solid rgba(255,255,255,0.7)',
    }}
  >
    <span style={{ fontSize: 13, fontWeight: 700 }}>Innovation</span>
    <span style={{ fontSize: 11, opacity: 0.85 }}>{data.count} demandes</span>
    <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    <Handle type="source" position={Position.Left} style={{ opacity: 0 }} />
    <Handle type="source" position={Position.Top} style={{ opacity: 0 }} />
  </div>
));
RootNode.displayName = 'RootNode';

const GroupNode = memo(({ data }: { data: any }) => {
  const color = GROUP_PALETTE[data.colorIndex % GROUP_PALETTE.length];
  return (
    <div
      style={{
        borderRadius: 999,
        padding: '8px 18px',
        background: data.isActive ? `${color}dd` : `${color}1a`,
        backdropFilter: 'blur(8px)',
        border: `1.5px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        transition: 'transform 150ms ease, box-shadow 150ms ease',
        boxShadow: `0 2px 12px ${color}30`,
        whiteSpace: 'nowrap' as const,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: data.isActive ? '#fff' : color }}>
        {data.label}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#fff',
          background: color,
          borderRadius: 999,
          padding: '1px 7px',
          lineHeight: '16px',
        }}
      >
        {data.count}
      </span>
    </div>
  );
});
GroupNode.displayName = 'GroupNode';

const SubGroupNode = memo(({ data }: { data: any }) => {
  const color = GROUP_PALETTE[data.colorIndex % GROUP_PALETTE.length];
  return (
    <div
      style={{
        borderRadius: 999,
        padding: '5px 14px',
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(6px)',
        border: `1px solid ${color}60`,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        transition: 'transform 150ms ease',
        whiteSpace: 'nowrap' as const,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 500, color: `${color}` }}>{data.label}</span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: '#fff',
          background: `${color}aa`,
          borderRadius: 999,
          padding: '1px 6px',
        }}
      >
        {data.count}
      </span>
    </div>
  );
});
SubGroupNode.displayName = 'SubGroupNode';

const LeafNode = memo(({ data }: { data: any }) => {
  const statusColor = STATUS_CONFIG[data.status]?.color || '#888';
  return (
    <div
      style={{
        borderRadius: 999,
        padding: '4px 12px',
        background: `${statusColor}22`,
        border: `1px solid ${statusColor}`,
        cursor: 'pointer',
        maxWidth: 150,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
        fontSize: 10,
        fontWeight: 500,
        color: statusColor,
        transition: 'background 150ms ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${statusColor}55`; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${statusColor}22`; }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {data.label}
    </div>
  );
});
LeafNode.displayName = 'LeafNode';

const ClusterNode = memo(({ data }: { data: any }) => (
  <div
    style={{
      width: 48,
      height: 48,
      borderRadius: '50%',
      border: '1.5px dashed rgba(150,150,150,0.4)',
      background: 'rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 10,
      color: '#999',
    }}
  >
    <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
    +{data.count}
  </div>
));
ClusterNode.displayName = 'ClusterNode';

const nodeTypes = {
  rootNode: RootNode,
  groupNode: GroupNode,
  subGroupNode: SubGroupNode,
  leafNode: LeafNode,
  clusterNode: ClusterNode,
};

// ── Radial Graph Builder ──

function buildRadialGraph(
  requests: InnoRequest[],
  groupBy: GroupingField,
  subGroupBy: GroupingField | null,
  drillPath: string[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const CX = 0, CY = 0;

  nodes.push({
    id: 'root',
    position: { x: CX - 50, y: CY - 50 },
    type: 'rootNode',
    data: { label: 'Innovation', count: requests.length, isRoot: true },
  });

  const groups = new Map<string, InnoRequest[]>();
  requests.forEach(r => {
    const key = getFieldValue(r, groupBy);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  });

  const groupEntries = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const drillLevel1 = drillPath[0];
  const filteredGroups = drillLevel1
    ? groupEntries.filter(([k]) => k === drillLevel1)
    : groupEntries;

  const R1 = 280;
  const R2 = 520;
  const R3 = 720;
  const totalGroups = filteredGroups.length;

  filteredGroups.forEach(([groupKey, groupReqs], gi) => {
    const angle1 = totalGroups === 1 ? 0 : (gi / totalGroups) * 360;
    const pos1 = polarToCartesian(CX, CY, R1, angle1);
    const gId = `g-${gi}`;

    nodes.push({
      id: gId,
      position: { x: pos1.x - 60, y: pos1.y - 20 },
      type: 'groupNode',
      data: {
        label: groupKey,
        count: groupReqs.length,
        level: 1,
        groupKey,
        colorIndex: gi,
        isActive: !!drillLevel1,
      },
    });
    edges.push({
      id: `e-root-${gId}`,
      source: 'root',
      target: gId,
      type: 'smoothstep',
      style: { stroke: GROUP_PALETTE[gi % GROUP_PALETTE.length], strokeWidth: 2, opacity: 0.6 },
    });

    // If not drilled and has subGroupBy, don't expand further
    if (subGroupBy && !drillLevel1) return;

    if (subGroupBy) {
      const subGroups = new Map<string, InnoRequest[]>();
      groupReqs.forEach(r => {
        const sk = getFieldValue(r, subGroupBy);
        if (!subGroups.has(sk)) subGroups.set(sk, []);
        subGroups.get(sk)!.push(r);
      });
      const subEntries = [...subGroups.entries()].sort((a, b) => b[1].length - a[1].length);
      const drillLevel2 = drillPath[1];
      const filteredSubs = drillLevel2 ? subEntries.filter(([k]) => k === drillLevel2) : subEntries;

      filteredSubs.forEach(([subKey, subReqs], si) => {
        const spreadAngle = Math.min(120, 360 / Math.max(totalGroups, 1));
        const startAngle = angle1 - spreadAngle / 2;
        const angle2 = filteredSubs.length === 1
          ? angle1
          : startAngle + (si / (filteredSubs.length - 1)) * spreadAngle;
        const pos2 = polarToCartesian(CX, CY, R2, angle2);
        const sgId = `sg-${gi}-${si}`;

        nodes.push({
          id: sgId,
          position: { x: pos2.x - 55, y: pos2.y - 16 },
          type: 'subGroupNode',
          data: { label: subKey, count: subReqs.length, level: 2, groupKey: subKey, colorIndex: gi },
        });
        edges.push({
          id: `e-${gId}-${sgId}`,
          source: gId,
          target: sgId,
          type: 'smoothstep',
          style: { stroke: GROUP_PALETTE[gi % GROUP_PALETTE.length], strokeWidth: 1.5, opacity: 0.4 },
        });

        // Leaves when drilled to level 2
        if (drillLevel2 === subKey || !drillLevel2) {
          const leafReqs = subReqs.slice(0, CLUSTER_LIMIT);
          const spreadLeaf = Math.min(80, spreadAngle);

          leafReqs.forEach((r, ri) => {
            const leafAngle = leafReqs.length === 1
              ? angle2
              : angle2 - spreadLeaf / 2 + (ri / (leafReqs.length - 1)) * spreadLeaf;
            const pos3 = polarToCartesian(CX, CY, R3, leafAngle);
            const leafId = `leaf-${r.id}`;
            nodes.push({
              id: leafId,
              position: { x: pos3.x - 65, y: pos3.y - 14 },
              type: 'leafNode',
              data: { label: r.nom_projet || r.title, requestId: r.id, status: r.status, level: 3 },
            });
            edges.push({
              id: `e-${sgId}-${leafId}`,
              source: sgId,
              target: leafId,
              type: 'smoothstep',
              style: { stroke: STATUS_CONFIG[r.status]?.color || '#888', strokeWidth: 1, opacity: 0.5 },
            });
          });

          if (subReqs.length > CLUSTER_LIMIT) {
            const clusterAngle = angle2 + spreadLeaf / 2 + 10;
            const posC = polarToCartesian(CX, CY, R3, clusterAngle);
            const clusterId = `cluster-${gi}-${si}`;
            nodes.push({
              id: clusterId,
              position: { x: posC.x - 24, y: posC.y - 24 },
              type: 'clusterNode',
              data: { label: `+${subReqs.length - CLUSTER_LIMIT}`, count: subReqs.length - CLUSTER_LIMIT, isCluster: true },
            });
            edges.push({
              id: `e-${sgId}-${clusterId}`,
              source: sgId,
              target: clusterId,
              type: 'smoothstep',
              style: { stroke: '#666', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.3 },
            });
          }
        }
      });
    } else {
      // No sub-grouping: leaves directly when drilled
      if (drillLevel1 === groupKey) {
        const leafReqs = groupReqs.slice(0, CLUSTER_LIMIT);
        const spreadLeaf = 80;

        leafReqs.forEach((r, ri) => {
          const leafAngle = leafReqs.length === 1
            ? angle1
            : angle1 - spreadLeaf / 2 + (ri / (leafReqs.length - 1)) * spreadLeaf;
          const pos2 = polarToCartesian(CX, CY, R2, leafAngle);
          const leafId = `leaf-${r.id}`;
          nodes.push({
            id: leafId,
            position: { x: pos2.x - 65, y: pos2.y - 14 },
            type: 'leafNode',
            data: { label: r.nom_projet || r.title, requestId: r.id, status: r.status, level: 3 },
          });
          edges.push({
            id: `e-${gId}-${leafId}`,
            source: gId,
            target: leafId,
            type: 'smoothstep',
            style: { stroke: STATUS_CONFIG[r.status]?.color || '#888', strokeWidth: 1 },
          });
        });

        if (groupReqs.length > CLUSTER_LIMIT) {
          const clusterAngle = angle1 + spreadLeaf / 2 + 10;
          const posC = polarToCartesian(CX, CY, R2, clusterAngle);
          const clusterId = `cluster-${gi}`;
          nodes.push({
            id: clusterId,
            position: { x: posC.x - 24, y: posC.y - 24 },
            type: 'clusterNode',
            data: { label: `+${groupReqs.length - CLUSTER_LIMIT}`, count: groupReqs.length - CLUSTER_LIMIT, isCluster: true },
          });
          edges.push({
            id: `e-${gId}-${clusterId}`,
            source: gId,
            target: clusterId,
            type: 'smoothstep',
            style: { stroke: '#666', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.3 },
          });
        }
      }
    }
  });

  return { nodes, edges };
}

// ── Inner Component ──

function MindMapInner({ requests, onOpenDetail }: Props) {
  const [groupBy, setGroupBy] = useState<GroupingField>('status');
  const [subGroupBy, setSubGroupBy] = useState<GroupingField | null>('entite_concernee');
  const [drillPath, setDrillPath] = useState<string[]>([]);
  const { fitView } = useReactFlow();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildRadialGraph(requests, groupBy, subGroupBy, drillPath),
    [requests, groupBy, subGroupBy, drillPath],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
  }, [initialNodes, initialEdges]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    const d = node.data as any;
    if (d.requestId) { onOpenDetail(d.requestId); return; }
    if (d.isRoot || d.isCluster) return;
    if (d.level === 1) setDrillPath([d.groupKey]);
    else if (d.level === 2) setDrillPath(prev => [prev[0] || '', d.groupKey]);
  }, [onOpenDetail]);

  const subGroupOptions = GROUPING_FIELDS.filter(f => f.value !== groupBy);

  return (
    <div className="h-[75vh] w-full relative rounded-xl border border-border overflow-hidden bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        className="rounded-xl overflow-hidden"
      >
        <Background gap={24} size={1} color="rgba(255,255,255,0.06)" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={2}
          pannable
          zoomable
          style={{ width: 140, height: 90 }}
          nodeColor={(n: Node) => {
            const d = n.data as any;
            if (d.status) return STATUS_CONFIG[d.status]?.color || '#888';
            if (typeof d.colorIndex === 'number') return GROUP_PALETTE[d.colorIndex % GROUP_PALETTE.length];
            return '#6366f1';
          }}
        />

        {/* Controls Panel */}
        <Panel position="top-left" className="m-3">
          <div className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-background/80 backdrop-blur-md shadow-xl">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Paramètres</p>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20">Grouper</span>
              <Select value={groupBy} onValueChange={v => { setGroupBy(v as GroupingField); setDrillPath([]); }}>
                <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GROUPING_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20">Sous-groupe</span>
              <Select value={subGroupBy || 'none'} onValueChange={v => { setSubGroupBy(v === 'none' ? null : v as GroupingField); setDrillPath([]); }}>
                <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {subGroupOptions.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-20">Vue</span>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => fitView({ padding: 0.15, duration: 400 })}>
                <Maximize2 className="w-3 h-3 mr-1" /> Centrer
              </Button>
            </div>

            <div className="mt-1 pt-2 border-t border-border flex flex-col gap-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Statuts</p>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: v.color }} />
                  <span className="text-[10px] text-muted-foreground">{v.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Breadcrumb */}
        {drillPath.length > 0 && (
          <Panel position="top-right" className="m-3">
            <div className="flex items-center gap-1 px-3 py-2 rounded-xl border border-border bg-background/80 backdrop-blur-md shadow-lg">
              <button onClick={() => setDrillPath([])} className="text-xs text-primary hover:underline font-medium">
                Tout
              </button>
              {drillPath.map((seg, i) => (
                <span key={i} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <button
                    onClick={() => setDrillPath(drillPath.slice(0, i + 1))}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {seg}
                  </button>
                </span>
              ))}
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

export function InnovationRequestsMindMap(props: Props) {
  return (
    <ReactFlowProvider>
      <MindMapInner {...props} />
    </ReactFlowProvider>
  );
}
