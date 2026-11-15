import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  GitFork,
  HardDrive,
  Link2,
  Plus,
  Server,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';
import { Select } from '../../components/Select';
import type { LinkedServerSummary } from './LinkedServersSection';

export type TopologyEdgeSource =
  | 'manual'
  | 'telemetry_key'
  | 'telemetry_name'
  | 'verified';

export interface ServerTopologyEdge {
  connectionId: number | null;
  proxyServerId: number;
  backendServerId: number;
  routeLabel: string | null;
  isDefault: boolean;
  source: TopologyEdgeSource;
  proxyReportedOnline: boolean | null;
  proxyReportedPlayers: number | null;
}

export interface UnlinkedProxyBackend {
  proxyServerId: number;
  name: string;
  serverPublicKey: string | null;
  isDefault: boolean;
  isOnline: boolean | null;
  onlinePlayers: number | null;
}

interface GraphNodeItem {
  key: string;
  kind: 'linked' | 'ghost';
  server?: LinkedServerSummary;
  ghost?: UnlinkedProxyBackend;
}

interface PositionedNode extends GraphNodeItem {
  x: number;
  y: number;
  depth: number;
  hasIncoming: boolean;
  hasOutgoing: boolean;
  outCount: number;
}

interface PositionedEdge {
  key: string;
  fromKey: string;
  toKey: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  pillX: number;
  pillY: number;
  routeLabel: string | null;
  isDefault: boolean;
  source: TopologyEdgeSource | 'ghost';
  connectionId: number | null;
  proxyServerId: number;
  backendServerId: number | null;
  isLive: boolean;
  isSelectedPath: boolean;
}

const NODE_W = 224;
const NODE_H = 96;
const H_GAP = 28;
const V_GAP = 82;
const STAGE_PAD_X = 28;
const STAGE_PAD_Y = 26;

const formatShortMemory = (mb: number | null | undefined): string => {
  if (mb == null || mb <= 0) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)}G`;
  return `${mb}M`;
};

function computeGraphLayout(
  servers: LinkedServerSummary[],
  edges: ServerTopologyEdge[],
  unlinkedBackends: UnlinkedProxyBackend[],
  selectedId: number | null
): {
  nodes: PositionedNode[];
  renderedEdges: PositionedEdge[];
  standaloneServers: LinkedServerSummary[];
  stageWidth: number;
  stageHeight: number;
} {
  const serverById = new Map<number, LinkedServerSummary>();
  for (const srv of servers) {
    serverById.set(srv.id, srv);
  }

  const connectedIds = new Set<number>();
  for (const edge of edges) {
    if (serverById.has(edge.proxyServerId) && serverById.has(edge.backendServerId)) {
      connectedIds.add(edge.proxyServerId);
      connectedIds.add(edge.backendServerId);
    }
  }
  for (const ub of unlinkedBackends) {
    if (serverById.has(ub.proxyServerId)) {
      connectedIds.add(ub.proxyServerId);
    }
  }

  // Include all Vine proxies in the graph stage (even before their first backend is attached)
  // plus every server participating in at least one connection
  const graphLinkedServers = servers.filter(
    (s) => s.serverType === 'vine' || connectedIds.has(s.id)
  );
  const standaloneServers = servers.filter(
    (s) => s.serverType !== 'vine' && !connectedIds.has(s.id)
  );

  const items = new Map<string, GraphNodeItem>();
  for (const srv of graphLinkedServers) {
    items.set(`srv-${srv.id}`, {
      key: `srv-${srv.id}`,
      kind: 'linked',
      server: srv,
    });
  }

  unlinkedBackends.forEach((ub, idx) => {
    const parentKey = `srv-${ub.proxyServerId}`;
    if (!items.has(parentKey)) return;
    const ghostKey = `ghost-${ub.proxyServerId}-${idx}`;
    items.set(ghostKey, {
      key: ghostKey,
      kind: 'ghost',
      ghost: ub,
    });
  });

  if (items.size === 0) {
    return {
      nodes: [],
      renderedEdges: [],
      standaloneServers,
      stageWidth: 0,
      stageHeight: 0,
    };
  }

  interface RawLink {
    key: string;
    from: string;
    to: string;
    routeLabel: string | null;
    isDefault: boolean;
    source: TopologyEdgeSource | 'ghost';
    connectionId: number | null;
    proxyServerId: number;
    backendServerId: number | null;
    isLive: boolean;
    isSelectedPath: boolean;
  }

  const rawLinks: RawLink[] = [];
  const childrenMap = new Map<string, string[]>();
  const parentsMap = new Map<string, string[]>();

  for (const k of items.keys()) {
    childrenMap.set(k, []);
    parentsMap.set(k, []);
  }

  for (const edge of edges) {
    const from = `srv-${edge.proxyServerId}`;
    const to = `srv-${edge.backendServerId}`;
    if (!items.has(from) || !items.has(to)) continue;
    const pSrv = serverById.get(edge.proxyServerId);
    const bSrv = serverById.get(edge.backendServerId);
    const isLive = Boolean(pSrv?.isOnline && (bSrv?.isOnline || edge.proxyReportedOnline));
    const isSelectedPath =
      selectedId != null &&
      (edge.proxyServerId === selectedId || edge.backendServerId === selectedId);

    childrenMap.get(from)!.push(to);
    parentsMap.get(to)!.push(from);
    rawLinks.push({
      key: `edge-${edge.proxyServerId}-${edge.backendServerId}`,
      from,
      to,
      routeLabel: edge.routeLabel,
      isDefault: edge.isDefault,
      source: edge.source,
      connectionId: edge.connectionId,
      proxyServerId: edge.proxyServerId,
      backendServerId: edge.backendServerId,
      isLive,
      isSelectedPath,
    });
  }

  unlinkedBackends.forEach((ub, idx) => {
    const from = `srv-${ub.proxyServerId}`;
    const to = `ghost-${ub.proxyServerId}-${idx}`;
    if (!items.has(from) || !items.has(to)) return;
    const pSrv = serverById.get(ub.proxyServerId);
    const isLive = Boolean(pSrv?.isOnline && ub.isOnline);
    const isSelectedPath = selectedId != null && ub.proxyServerId === selectedId;

    childrenMap.get(from)!.push(to);
    parentsMap.get(to)!.push(from);
    rawLinks.push({
      key: to,
      from,
      to,
      routeLabel: ub.name,
      isDefault: ub.isDefault,
      source: 'ghost',
      connectionId: null,
      proxyServerId: ub.proxyServerId,
      backendServerId: null,
      isLive,
      isSelectedPath,
    });
  });

  // Sort each parent's children so default route comes first, then linked before ghost, then name
  for (const [, list] of childrenMap) {
    list.sort((a, b) => {
      const linkA = rawLinks.find((l) => l.to === a);
      const linkB = rawLinks.find((l) => l.to === b);
      if (linkA?.isDefault !== linkB?.isDefault) {
        return linkA?.isDefault ? -1 : 1;
      }
      const itemA = items.get(a)!;
      const itemB = items.get(b)!;
      if (itemA.kind !== itemB.kind) {
        return itemA.kind === 'linked' ? -1 : 1;
      }
      const nameA = itemA.server?.displayName || itemA.ghost?.name || a;
      const nameB = itemB.server?.displayName || itemB.ghost?.name || b;
      return nameA.localeCompare(nameB);
    });
  }

  // Compute longest-path depth from roots (guarded against unexpected cycles)
  const depthMap = new Map<string, number>();
  const visiting = new Set<string>();

  const computeDepth = (nodeKey: string): number => {
    if (depthMap.has(nodeKey)) return depthMap.get(nodeKey)!;
    if (visiting.has(nodeKey)) return 0;
    visiting.add(nodeKey);
    const parents = parentsMap.get(nodeKey) || [];
    let d = 0;
    for (const p of parents) {
      d = Math.max(d, Math.min(8, computeDepth(p) + 1));
    }
    visiting.delete(nodeKey);
    depthMap.set(nodeKey, d);
    return d;
  };

  for (const k of items.keys()) {
    computeDepth(k);
  }

  const isPureForest = Array.from(parentsMap.values()).every((p) => p.length <= 1);
  const coords = new Map<string, { x: number; y: number }>();

  if (isPureForest) {
    // Exact subtree-centered tree layout (zero edge crossings, dead-center parent alignment)
    const subtreeWidths = new Map<string, number>();
    const calcWidth = (k: string, seen: Set<string>): number => {
      if (subtreeWidths.has(k)) return subtreeWidths.get(k)!;
      if (seen.has(k)) return NODE_W;
      seen.add(k);
      const kids = childrenMap.get(k) || [];
      if (kids.length === 0) {
        subtreeWidths.set(k, NODE_W);
        return NODE_W;
      }
      let sum = 0;
      kids.forEach((child, idx) => {
        if (idx > 0) sum += H_GAP;
        sum += calcWidth(child, seen);
      });
      const w = Math.max(NODE_W, sum);
      subtreeWidths.set(k, w);
      return w;
    };

    const roots = Array.from(items.keys()).filter(
      (k) => (parentsMap.get(k)?.length ?? 0) === 0
    );
    // Fallback if every node somehow had a parent
    if (roots.length === 0) {
      const firstKey = items.keys().next().value as string;
      roots.push(firstKey);
    }

    for (const r of roots) {
      calcWidth(r, new Set());
    }

    const placeSubtree = (k: string, leftX: number, depth: number, placed: Set<string>) => {
      if (placed.has(k)) return;
      placed.add(k);
      const kids = (childrenMap.get(k) || []).filter((c) => !placed.has(c));
      const y = STAGE_PAD_Y + depth * (NODE_H + V_GAP);

      if (kids.length === 0) {
        coords.set(k, { x: leftX, y });
        return;
      }

      let childrenTotal = 0;
      kids.forEach((c, idx) => {
        if (idx > 0) childrenTotal += H_GAP;
        childrenTotal += subtreeWidths.get(c) ?? NODE_W;
      });

      const myWidth = subtreeWidths.get(k) ?? NODE_W;
      let childCursor = leftX + Math.max(0, (myWidth - childrenTotal) / 2);
      for (const c of kids) {
        const cw = subtreeWidths.get(c) ?? NODE_W;
        placeSubtree(c, childCursor, depth + 1, placed);
        childCursor += cw + H_GAP;
      }

      const firstChildX = coords.get(kids[0])!.x;
      const lastChildX = coords.get(kids[kids.length - 1])!.x;
      coords.set(k, { x: (firstChildX + lastChildX) / 2, y });
    };

    let cursorX = STAGE_PAD_X;
    const placed = new Set<string>();
    for (const r of roots) {
      const rw = subtreeWidths.get(r) ?? NODE_W;
      placeSubtree(r, cursorX, 0, placed);
      cursorX += rw + H_GAP * 1.5;
    }
  } else {
    // Multi-proxy shared-backend DAG layout (layered barycenter ordering)
    const layers = new Map<number, string[]>();
    let maxDepth = 0;
    for (const [k, d] of depthMap.entries()) {
      maxDepth = Math.max(maxDepth, d);
      if (!layers.has(d)) layers.set(d, []);
      layers.get(d)!.push(k);
    }

    let maxRowWidth = 0;
    for (let d = 0; d <= maxDepth; d++) {
      const row = layers.get(d) || [];
      const w = row.length * NODE_W + Math.max(0, row.length - 1) * H_GAP;
      maxRowWidth = Math.max(maxRowWidth, w);
    }

    for (let d = 0; d <= maxDepth; d++) {
      const row = layers.get(d) || [];
      if (d > 0) {
        row.sort((a, b) => {
          const pa = parentsMap.get(a) || [];
          const pb = parentsMap.get(b) || [];
          const avgA =
            pa.length > 0
              ? pa.reduce((acc, p) => acc + (coords.get(p)?.x ?? 0), 0) / pa.length
              : 0;
          const avgB =
            pb.length > 0
              ? pb.reduce((acc, p) => acc + (coords.get(p)?.x ?? 0), 0) / pb.length
              : 0;
          return avgA - avgB;
        });
      }
      const rowWidth = row.length * NODE_W + Math.max(0, row.length - 1) * H_GAP;
      const startX = STAGE_PAD_X + (maxRowWidth - rowWidth) / 2;
      const y = STAGE_PAD_Y + d * (NODE_H + V_GAP);
      row.forEach((k, idx) => {
        coords.set(k, { x: startX + idx * (NODE_W + H_GAP), y });
      });
    }
  }

  let maxRight = 0;
  let maxBottom = 0;
  const nodes: PositionedNode[] = [];

  for (const [k, item] of items.entries()) {
    const pos = coords.get(k) ?? { x: STAGE_PAD_X, y: STAGE_PAD_Y };
    const outList = childrenMap.get(k) || [];
    const inList = parentsMap.get(k) || [];
    maxRight = Math.max(maxRight, pos.x + NODE_W);
    maxBottom = Math.max(maxBottom, pos.y + NODE_H);
    nodes.push({
      ...item,
      x: pos.x,
      y: pos.y,
      depth: depthMap.get(k) ?? 0,
      hasIncoming: inList.length > 0,
      hasOutgoing: outList.length > 0,
      outCount: outList.length,
    });
  }

  const renderedEdges: PositionedEdge[] = rawLinks.map((link, idx) => {
    const srcPos = coords.get(link.from) ?? { x: STAGE_PAD_X, y: STAGE_PAD_Y };
    const dstPos = coords.get(link.to) ?? { x: STAGE_PAD_X, y: STAGE_PAD_Y };
    const x1 = srcPos.x + NODE_W / 2;
    const y1 = srcPos.y + NODE_H;
    const x2 = dstPos.x + NODE_W / 2;
    const y2 = dstPos.y;

    // Position the route pill slightly closer to the target node so fan-out labels separate cleanly
    const u = isPureForest ? 0.62 : 0.5 + ((idx % 3) - 1) * 0.1;
    const midY = (y1 + y2) / 2;
    const inv = 1 - u;
    const pillX =
      inv * inv * inv * x1 +
      3 * inv * inv * u * x1 +
      3 * inv * u * u * x2 +
      u * u * u * x2;
    const pillY =
      inv * inv * inv * y1 +
      3 * inv * inv * u * midY +
      3 * inv * u * u * midY +
      u * u * u * y2;

    return {
      key: link.key,
      fromKey: link.from,
      toKey: link.to,
      x1,
      y1,
      x2,
      y2,
      pillX,
      pillY,
      routeLabel: link.routeLabel,
      isDefault: link.isDefault,
      source: link.source,
      connectionId: link.connectionId,
      proxyServerId: link.proxyServerId,
      backendServerId: link.backendServerId,
      isLive: link.isLive,
      isSelectedPath: link.isSelectedPath,
    };
  });

  return {
    nodes,
    renderedEdges,
    standaloneServers,
    stageWidth: maxRight + STAGE_PAD_X,
    stageHeight: maxBottom + STAGE_PAD_Y,
  };
}

interface ServerTopologyGraphProps {
  servers: LinkedServerSummary[];
  edges: ServerTopologyEdge[];
  unlinkedBackends: UnlinkedProxyBackend[];
  selectedId: number | null;
  onSelectServer: (id: number) => void;
  onConnectServer: (
    proxyServerId: number,
    backendServerId: number,
    routeLabel: string | null,
    isDefault: boolean
  ) => Promise<boolean>;
  onDisconnectServer: (proxyServerId: number, backendServerId: number) => Promise<void>;
}

export const ServerTopologyGraph: React.FC<ServerTopologyGraphProps> = ({
  servers,
  edges,
  unlinkedBackends,
  selectedId,
  onSelectServer,
  onConnectServer,
  onDisconnectServer,
}) => {
  const vineProxies = useMemo(
    () => servers.filter((s) => s.serverType === 'vine'),
    [servers]
  );

  const [showBuilder, setShowBuilder] = useState(false);
  const [proxyIdInput, setProxyIdInput] = useState<string>('');
  const [backendIdInput, setBackendIdInput] = useState<string>('');
  const [routeLabelInput, setRouteLabelInput] = useState('');
  const [isDefaultInput, setIsDefaultInput] = useState(false);
  const [savingEdge, setSavingEdge] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const resolvedProxyId = useMemo(() => {
    if (proxyIdInput && vineProxies.some((v) => String(v.id) === proxyIdInput)) {
      return proxyIdInput;
    }
    const selectedVine = vineProxies.find((v) => v.id === selectedId);
    if (selectedVine) return String(selectedVine.id);
    return vineProxies[0] ? String(vineProxies[0].id) : '';
  }, [proxyIdInput, selectedId, vineProxies]);

  const candidateBackends = useMemo(
    () => servers.filter((s) => String(s.id) !== resolvedProxyId),
    [resolvedProxyId, servers]
  );

  const resolvedBackendId = useMemo(() => {
    if (backendIdInput && candidateBackends.some((b) => String(b.id) === backendIdInput)) {
      return backendIdInput;
    }
    return candidateBackends[0] ? String(candidateBackends[0].id) : '';
  }, [backendIdInput, candidateBackends]);

  const { nodes, renderedEdges, standaloneServers, stageWidth, stageHeight } = useMemo(
    () => computeGraphLayout(servers, edges, unlinkedBackends, selectedId),
    [edges, selectedId, servers, unlinkedBackends]
  );

  if (vineProxies.length === 0 && edges.length === 0 && unlinkedBackends.length === 0) {
    return null;
  }

  const connectedBackendCount = new Set(edges.map((e) => e.backendServerId)).size;
  const proxyIngressPlayers = vineProxies.reduce(
    (sum, v) => sum + (v.isOnline ? v.onlinePlayers : 0),
    0
  );

  const handleOpenBuilderForBackend = (targetBackendId?: number, suggestedLabel?: string) => {
    if (!proxyIdInput && vineProxies[0]) {
      const preferred = vineProxies.find((v) => v.id === selectedId) || vineProxies[0];
      setProxyIdInput(String(preferred.id));
    }
    if (targetBackendId != null) {
      setBackendIdInput(String(targetBackendId));
    }
    if (suggestedLabel !== undefined) {
      setRouteLabelInput(suggestedLabel);
    }
    setShowBuilder(true);
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pId = Number(resolvedProxyId);
    const bId = Number(resolvedBackendId);
    if (!pId || !bId || pId === bId) return;

    setSavingEdge(true);
    try {
      const ok = await onConnectServer(
        pId,
        bId,
        routeLabelInput.trim() || null,
        isDefaultInput
      );
      if (ok) {
        setRouteLabelInput('');
        setIsDefaultInput(false);
        setShowBuilder(false);
      }
    } finally {
      setSavingEdge(false);
    }
  };

  const handleRemoveEdge = async (
    e: React.MouseEvent,
    proxyServerId: number,
    backendServerId: number
  ) => {
    e.stopPropagation();
    const key = `${proxyServerId}-${backendServerId}`;
    setRemovingKey(key);
    try {
      await onDisconnectServer(proxyServerId, backendServerId);
    } finally {
      setRemovingKey(null);
    }
  };

  const proxyOptions = vineProxies.map((v) => ({
    value: String(v.id),
    label: `${v.displayName} (Vine ${v.serverVersion || 'Proxy'})`,
  }));

  const backendOptions = candidateBackends.map((b) => ({
    value: String(b.id),
    label: `${b.displayName} (${b.serverType === 'vine' ? 'Vine Proxy' : 'Pumpkin'})`,
  }));

  return (
    <section className="panel">
      <header className="panel-head">
        <div
          className="row"
          style={{ width: '100%', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}
        >
          <div className="row" style={{ gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <GitFork size={18} style={{ color: 'var(--success)' }} />
            <h3 className="h3" style={{ margin: 0 }}>
              Network Topology
            </h3>
            <span className="sticker sticker-sm ac-sticker-vine">
              {vineProxies.length} {vineProxies.length === 1 ? 'Vine Proxy' : 'Vine Proxies'}
            </span>
            <span className="sticker sticker-sm">
              {connectedBackendCount} Linked{' '}
              {connectedBackendCount === 1 ? 'Backend' : 'Backends'}
            </span>
            {proxyIngressPlayers > 0 && (
              <span className="tag tag-pumpkin">
                <Users size={12} /> {proxyIngressPlayers.toLocaleString()} Routed Online
              </span>
            )}
          </div>

          <span className="spacer" />

          {vineProxies.length > 0 && servers.length > 1 && (
            <button
              type="button"
              className={`button button-sm ${showBuilder ? '' : 'button-primary'}`}
              onClick={() => setShowBuilder((prev) => !prev)}
            >
              {showBuilder ? (
                <>
                  <X size={14} /> Close
                </>
              ) : (
                <>
                  <Link2 size={14} /> Connect Server
                </>
              )}
            </button>
          )}
        </div>
      </header>

      <div className="panel-body stack">
        {/* Manual Connection Builder Bar */}
        {showBuilder && vineProxies.length > 0 && candidateBackends.length > 0 && (
          <form
            onSubmit={handleConnectSubmit}
            className="panel"
            style={{ padding: '0.9rem 1rem', background: 'var(--sunk)' }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
                gap: '0.75rem',
                alignItems: 'end',
              }}
            >
              <div className="field" style={{ margin: 0 }}>
                <span className="field-label">Vine Proxy (Upstream)</span>
                <Select
                  value={resolvedProxyId}
                  onChange={setProxyIdInput}
                  options={proxyOptions}
                />
              </div>

              <div className="field" style={{ margin: 0 }}>
                <span className="field-label">Backend Node (Downstream)</span>
                <Select
                  value={resolvedBackendId}
                  onChange={setBackendIdInput}
                  options={backendOptions}
                />
              </div>

              <label className="field" style={{ margin: 0 }}>
                <span className="field-label">Route Name (Optional)</span>
                <span className="control">
                  <input
                    type="text"
                    className="input mono"
                    placeholder="lobby, survival-1…"
                    maxLength={48}
                    value={routeLabelInput}
                    onChange={(e) => setRouteLabelInput(e.target.value)}
                  />
                </span>
              </label>
            </div>

            <div
              className="row"
              style={{
                marginTop: '0.75rem',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                alignItems: 'center',
              }}
            >
              <label
                className="row small"
                style={{ gap: '0.45rem', alignItems: 'center', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={isDefaultInput}
                  onChange={(e) => setIsDefaultInput(e.target.checked)}
                />
                <span>Default / fallback route on this Vine proxy</span>
              </label>

              <div className="row" style={{ gap: '0.5rem' }}>
                <button
                  type="button"
                  className="button button-ghost button-sm"
                  onClick={() => setShowBuilder(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary button-sm"
                  disabled={savingEdge || !resolvedProxyId || !resolvedBackendId}
                >
                  <Check size={14} /> {savingEdge ? 'Connecting…' : 'Save Route'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Interactive Tree / Node Graph Canvas */}
        <div className="ac-topo-stage" role="region" aria-label="Vine and Pumpkin network topology">
          <div
            className="ac-topo-canvas"
            style={{ width: Math.max(stageWidth, 300), height: Math.max(stageHeight, 148) }}
          >
            <svg
              className="ac-topo-svg"
              width={Math.max(stageWidth, 300)}
              height={Math.max(stageHeight, 148)}
              viewBox={`0 0 ${Math.max(stageWidth, 300)} ${Math.max(stageHeight, 148)}`}
            >
              {renderedEdges.map((edge) => {
                const midY = (edge.y1 + edge.y2) / 2;
                const d = `M ${edge.x1} ${edge.y1} C ${edge.x1} ${midY}, ${edge.x2} ${midY}, ${edge.x2} ${edge.y2}`;
                const baseStroke =
                  edge.source === 'ghost'
                    ? 'var(--line-2)'
                    : edge.isSelectedPath
                      ? 'var(--pumpkin)'
                      : edge.isLive
                        ? 'var(--success)'
                        : 'var(--line-2)';

                return (
                  <g key={edge.key}>
                    <path
                      d={d}
                      fill="none"
                      stroke={baseStroke}
                      strokeWidth={edge.isSelectedPath ? 2.75 : 2}
                      strokeDasharray={edge.source === 'ghost' ? '5 5' : undefined}
                      opacity={edge.isLive || edge.isSelectedPath ? 0.9 : 0.65}
                    />
                    {edge.isLive && edge.source !== 'ghost' && (
                      <path
                        d={d}
                        fill="none"
                        stroke={edge.isSelectedPath ? '#fff' : '#86efac'}
                        strokeWidth={2}
                        strokeDasharray="6 22"
                        strokeLinecap="round"
                        className="ac-topo-edge-flow"
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Connector Route Pills */}
            {renderedEdges.map((edge) => {
              const hasPillContent =
                Boolean(edge.routeLabel) ||
                edge.isDefault ||
                edge.connectionId != null ||
                edge.source === 'telemetry_key' ||
                edge.source === 'verified';
              if (!hasPillContent) return null;

              const removingThis =
                edge.backendServerId != null &&
                removingKey === `${edge.proxyServerId}-${edge.backendServerId}`;

              return (
                <div
                  key={`pill-${edge.key}`}
                  className={`ac-topo-edge-pill ${
                    edge.isSelectedPath
                      ? 'ac-topo-edge-pill-active'
                      : edge.isLive
                        ? 'ac-topo-edge-pill-vine'
                        : ''
                  }`}
                  style={{ left: edge.pillX, top: edge.pillY }}
                  title={
                    edge.source === 'verified'
                      ? 'Verified by both Vine telemetry and dashboard route'
                      : edge.source === 'telemetry_key'
                        ? 'Auto-discovered via Ed25519 key in telemetry'
                        : edge.source === 'telemetry_name'
                          ? 'Auto-matched from Vine backend route name'
                          : edge.source === 'ghost'
                            ? 'Reported by Vine telemetry (server not linked yet)'
                            : 'Configured in your Pumpkin Account'
                  }
                >
                  {edge.isDefault && (
                    <Star
                      size={10}
                      style={{ color: 'var(--warning)', fill: 'var(--warning)', flexShrink: 0 }}
                    />
                  )}
                  <span className="ac-topo-edge-label">
                    {edge.routeLabel || (edge.isDefault ? 'default' : 'route')}
                  </span>
                  {(edge.source === 'telemetry_key' || edge.source === 'verified') && (
                    <Sparkles
                      size={10}
                      style={{ color: 'var(--success)', flexShrink: 0 }}
                    />
                  )}
                  {edge.connectionId != null && edge.backendServerId != null && (
                    <button
                      type="button"
                      className="ac-topo-edge-unlink"
                      title="Disconnect route"
                      disabled={removingThis}
                      onClick={(ev) =>
                        void handleRemoveEdge(ev, edge.proxyServerId, edge.backendServerId!)
                      }
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Positioned Node Cards */}
            {nodes.map((node) => {
              if (node.kind === 'ghost' && node.ghost) {
                const g = node.ghost;
                return (
                  <div
                    key={node.key}
                    className="ac-topo-node ac-topo-node-ghost"
                    style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
                  >
                    <span className="ac-topo-port ac-topo-port-top" />
                    <div className="row" style={{ gap: '0.4rem', alignItems: 'center' }}>
                      <span
                        className="dot"
                        style={{
                          background: g.isOnline ? 'var(--success)' : 'var(--muted)',
                        }}
                      />
                      <strong
                        style={{
                          fontSize: '0.85rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={g.name}
                      >
                        {g.name}
                      </strong>
                      <span className="spacer" />
                      <span className="sticker sticker-sm">Unlinked</span>
                    </div>

                    <div
                      className="row small"
                      style={{ justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span className="muted" style={{ fontSize: '0.75rem' }}>
                        {g.onlinePlayers != null ? `${g.onlinePlayers} players` : 'Telemetry route'}
                      </span>
                      <Link to="/link" className="link link-pumpkin" style={{ fontSize: '0.75rem' }}>
                        Claim →
                      </Link>
                    </div>
                  </div>
                );
              }

              const srv = node.server!;
              const isVine = srv.serverType === 'vine';
              const isSelected = srv.id === selectedId;

              return (
                <div
                  key={node.key}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => onSelectServer(srv.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectServer(srv.id);
                    }
                  }}
                  className={`ac-topo-node ${
                    isVine ? 'ac-topo-node-vine' : 'ac-topo-node-pumpkin'
                  } ${isSelected ? 'ac-topo-node-selected' : ''}`}
                  style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
                >
                  {node.hasIncoming && (
                    <span
                      className={`ac-topo-port ac-topo-port-top ${
                        srv.isOnline
                          ? isVine
                            ? 'ac-topo-port-live-vine'
                            : 'ac-topo-port-live-pumpkin'
                          : ''
                      }`}
                    />
                  )}
                  {(node.hasOutgoing || isVine) && (
                    <span
                      className={`ac-topo-port ac-topo-port-bottom ${
                        srv.isOnline ? 'ac-topo-port-live-vine' : ''
                      }`}
                    />
                  )}

                  <div className="row" style={{ gap: '0.4rem', alignItems: 'center' }}>
                    <span
                      className="dot"
                      style={{
                        background: srv.isOnline ? 'var(--success)' : 'var(--muted)',
                        flexShrink: 0,
                      }}
                    />
                    <strong
                      style={{
                        fontSize: '0.875rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={srv.displayName}
                    >
                      {srv.displayName}
                    </strong>
                    <span className="spacer" />
                    <span
                      className={`sticker sticker-sm ${isVine ? 'ac-sticker-vine' : ''}`}
                      style={{ fontSize: '10px', padding: '1px 5px' }}
                    >
                      {isVine ? 'Vine' : 'Pumpkin'}
                    </span>
                  </div>

                  <div
                    className="row small"
                    style={{
                      fontSize: '0.75rem',
                      gap: '0.55rem',
                      alignItems: 'center',
                    }}
                  >
                    <span>
                      <Users size={12} style={{ verticalAlign: '-2px', marginRight: 3 }} />
                      <strong>{srv.onlinePlayers}</strong>/{srv.maxPlayers}
                    </span>
                    <span>
                      <HardDrive size={12} style={{ verticalAlign: '-2px', marginRight: 3 }} />
                      {formatShortMemory(srv.ramAllocatedMb)}
                    </span>
                    <span className="spacer" />
                    <span className="muted mono" style={{ fontSize: '0.7rem' }}>
                      {isVine
                        ? node.outCount > 0
                          ? `${node.outCount} ${node.outCount === 1 ? 'node' : 'nodes'}`
                          : srv.serverVersion
                            ? `v${srv.serverVersion}`
                            : 'proxy'
                        : srv.minecraftVersion || srv.serverVersion || ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Empty-edges guidance when a Vine proxy is linked but no backends are wired yet */}
        {edges.length === 0 && unlinkedBackends.length === 0 && (
          <div className="row small" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span className="muted">
              {servers.length > 1
                ? 'Connect your linked Pumpkin servers below to visualize your proxy routing tree, or report `backends` in your Vine telemetry heartbeat for automatic discovery.'
                : 'Link one or more backend Pumpkin servers (`pumpkin link`) to see them branch under your Vine proxy automatically.'}
            </span>
            {servers.length <= 1 && (
              <Link to="/link" className="link link-pumpkin small">
                + Link a Pumpkin Server
              </Link>
            )}
          </div>
        )}

        {/* Standalone / Unassigned Servers Strip */}
        {standaloneServers.length > 0 && (
          <div
            className="stack"
            style={
              {
                '--gap': '0.5rem',
                paddingTop: '0.65rem',
                borderTop: '1px solid var(--line)',
              } as React.CSSProperties
            }
          >
            <span className="label">
              Standalone Linked Servers ({standaloneServers.length})
            </span>
            <div className="ac-topo-standalone">
              {standaloneServers.map((srv) => {
                const active = srv.id === selectedId;
                return (
                  <div
                    key={srv.id}
                    className={`ac-topo-standalone-chip ${
                      active ? 'ac-topo-standalone-chip-active' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectServer(srv.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        border: 0,
                        padding: 0,
                        background: 'none',
                        color: 'inherit',
                        font: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        className="dot"
                        style={{
                          background: srv.isOnline ? 'var(--success)' : 'var(--muted)',
                        }}
                      />
                      <Server size={13} className="muted" />
                      <strong>{srv.displayName}</strong>
                      <span className="muted mono" style={{ fontSize: '0.75rem' }}>
                        {srv.onlinePlayers}/{srv.maxPlayers}
                      </span>
                    </button>
                    {vineProxies.length > 0 && (
                      <button
                        type="button"
                        className="button button-ghost button-sm"
                        style={{ height: '1.5rem', padding: '0 0.45rem', fontSize: '0.72rem' }}
                        title="Attach to Vine proxy"
                        onClick={() =>
                          handleOpenBuilderForBackend(
                            srv.id,
                            srv.displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                          )
                        }
                      >
                        <Plus size={12} /> Attach
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
