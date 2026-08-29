import type { GraphRelationship } from "./graphUtils";

function undirectedAdjacency(relationships: GraphRelationship[]) {
  const adjacency = new Map<string, string[]>();
  const connect = (from: string, to: string) => adjacency.set(from, Array.from(new Set([...(adjacency.get(from) ?? []), to])));
  relationships.forEach(relationship => {
    connect(relationship.sourceNode, relationship.targetNode);
    connect(relationship.targetNode, relationship.sourceNode);
  });
  return adjacency;
}

/** Returns the selected node plus only children of nodes deliberately expanded within a bounded depth. */
export function expandedGraphScope(rootId: string | null, expandedNodeIds: Set<string>, maxDepth: number, relationships: GraphRelationship[]) {
  if (!rootId) return new Set<string>();
  const adjacency = undirectedAdjacency(relationships);
  const visible = new Set<string>([rootId]);
  const queue = [{ id: rootId, depth: 0 }];

  while (queue.length) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth || !expandedNodeIds.has(current.id)) continue;
    (adjacency.get(current.id) ?? []).forEach(next => {
      if (visible.has(next)) return;
      visible.add(next);
      queue.push({ id: next, depth: current.depth + 1 });
    });
  }
  return visible;
}

/** Expands an observed neighborhood to the supplied depth; used for the explicit depth control. */
export function expandNodesToDepth(rootId: string | null, maxDepth: number, relationships: GraphRelationship[]) {
  if (!rootId || maxDepth <= 0) return new Set<string>();
  const adjacency = undirectedAdjacency(relationships);
  const expanded = new Set<string>();
  const visited = new Set<string>([rootId]);
  const queue = [{ id: rootId, depth: 0 }];

  while (queue.length) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;
    expanded.add(current.id);
    (adjacency.get(current.id) ?? []).forEach(next => {
      if (visited.has(next)) return;
      visited.add(next);
      queue.push({ id: next, depth: current.depth + 1 });
    });
  }
  return expanded;
}

/** Collapses a deliberate expansion and its currently expanded descendants. */
export function collapseExpandedNode(nodeId: string, expandedNodeIds: Set<string>, relationships: GraphRelationship[], rootId?: string | null) {
  const adjacency = undirectedAdjacency(relationships);
  const collapsed = new Set<string>([nodeId]);
  const queue = [nodeId];
  while (queue.length) {
    const current = queue.shift()!;
    if (!expandedNodeIds.has(current)) continue;
    (adjacency.get(current) ?? []).forEach(next => {
      if (rootId && nodeId !== rootId && next === rootId) return;
      if (!collapsed.has(next)) { collapsed.add(next); queue.push(next); }
    });
  }
  return new Set(Array.from(expandedNodeIds).filter(id => !collapsed.has(id)));
}

export function observedNeighborCount(nodeId: string, relationships: GraphRelationship[]) {
  return undirectedAdjacency(relationships).get(nodeId)?.length ?? 0;
}
