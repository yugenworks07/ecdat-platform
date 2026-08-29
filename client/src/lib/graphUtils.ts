export type GraphRelationship = { sourceNode: string; targetNode: string; relationship: string; evidence: string; confidence: number };
export type GraphFinding = { findingKey: string; assetName: string; algorithm: string; library: string | null; riskLevel: string };

export type EvidenceGraphNode = {
  id: string;
  label: string;
  type: string;
  column: number;
  x: number;
  y: number;
  color: string;
  findingKeys: string[];
};

export type EvidenceGraphEdge = GraphRelationship & { highlighted: boolean; source?: EvidenceGraphNode; target?: EvidenceGraphNode };

const nodeStyles: Record<string, { column: number; color: string }> = {
  service: { column: 0, color: "#fc4c1f" },
  library: { column: 1, color: "#fdc448" },
  algorithm: { column: 2, color: "#ff0003" },
  asset: { column: 2, color: "#ff8f3c" },
  certificate: { column: 3, color: "#3eb75e" },
  "certificate-authority": { column: 3, color: "#df3003" },
  endpoint: { column: 4, color: "#fdc448" },
  data: { column: 5, color: "#fc4c1f" },
  entity: { column: 1, color: "#9f9f9f" },
};

export const graphColumnLabels = ["Service", "Library", "Crypto", "Certificate", "Endpoint", "Data"];

export function nodeType(nodeId: string) {
  return nodeId.split(":")[0] || "entity";
}

export function nodeLabel(nodeId: string) {
  return nodeId.replace(/^[^:]+:/, "");
}

function findingKeysForNode(nodeId: string, findings: GraphFinding[]) {
  const label = nodeLabel(nodeId).toLowerCase();
  return findings.filter(finding => [finding.assetName, finding.algorithm, finding.library ?? ""].filter(Boolean).some(value => label === value.toLowerCase() || label.includes(value.toLowerCase()))).map(finding => finding.findingKey);
}

/** Deterministically projects observed relationship entities into six evidence-type columns. */
export function extractNodes(relationships: GraphRelationship[], findings: GraphFinding[]): EvidenceGraphNode[] {
  const ids = Array.from(new Set(relationships.flatMap(relationship => [relationship.sourceNode, relationship.targetNode])));
  const grouped = new Map<number, string[]>();
  ids.forEach(id => {
    const column = (nodeStyles[nodeType(id)] ?? nodeStyles.entity).column;
    grouped.set(column, [...(grouped.get(column) ?? []), id]);
  });
  return ids.map(id => {
    const type = nodeType(id);
    const style = nodeStyles[type] ?? nodeStyles.entity;
    const ordered = [...(grouped.get(style.column) ?? [])].sort((a, b) => nodeLabel(a).localeCompare(nodeLabel(b)));
    const row = ordered.indexOf(id);
    return { id, label: nodeLabel(id), type, column: style.column, x: 105 + style.column * 175, y: 105 + row * 84, color: style.color, findingKeys: findingKeysForNode(id, findings) };
  });
}

/** Builds only positioned edges that exist in active-scan relationship evidence. */
export function buildEdges(relationships: GraphRelationship[], nodes: EvidenceGraphNode[], chain = new Set<string>()): EvidenceGraphEdge[] {
  const byId = new Map(nodes.map(node => [node.id, node]));
  return relationships.map(relationship => ({ ...relationship, source: byId.get(relationship.sourceNode), target: byId.get(relationship.targetNode), highlighted: chain.has(relationship.sourceNode) && chain.has(relationship.targetNode) })).filter((edge): edge is EvidenceGraphEdge & { source: EvidenceGraphNode; target: EvidenceGraphNode } => Boolean(edge.source && edge.target));
}

function breadthFirst(start: string, adjacency: Map<string, string[]>, limit = 200) {
  const visited = new Set<string>([start]);
  const queue = [start];
  while (queue.length && visited.size < limit) {
    const current = queue.shift()!;
    (adjacency.get(current) ?? []).forEach(next => {
      if (!visited.has(next) && visited.size < limit) { visited.add(next); queue.push(next); }
    });
  }
  return visited;
}

/** Computes a bounded reverse-path evidence lens; it is not a reachability or exploit claim. */
export function computeBlastRadius(selectedId: string, relationships: GraphRelationship[]) {
  const reverse = new Map<string, string[]>();
  relationships.forEach(relationship => reverse.set(relationship.targetNode, [...(reverse.get(relationship.targetNode) ?? []), relationship.sourceNode]));
  const nodeIds = breadthFirst(selectedId, reverse);
  const edges = relationships.filter(relationship => nodeIds.has(relationship.sourceNode) && nodeIds.has(relationship.targetNode));
  const count = (types: string[]) => Array.from(nodeIds).filter(id => types.includes(nodeType(id))).length;
  const services = count(["service"]);
  const endpoints = count(["endpoint"]);
  const assets = count(["asset", "algorithm", "library", "certificate", "certificate-authority"]);
  const complexity = nodeIds.size >= 12 ? "Broad" : nodeIds.size >= 6 ? "Shared" : "Focused";
  return { nodeIds, edges, services, endpoints, assets, complexity };
}

/** Highlights every observed ancestor and descendant in the selected entity's relationship chain. */
export function computeChain(selectedId: string, relationships: GraphRelationship[]) {
  const forward = new Map<string, string[]>(); const backward = new Map<string, string[]>();
  relationships.forEach(relationship => {
    forward.set(relationship.sourceNode, [...(forward.get(relationship.sourceNode) ?? []), relationship.targetNode]);
    backward.set(relationship.targetNode, [...(backward.get(relationship.targetNode) ?? []), relationship.sourceNode]);
  });
  const chain = breadthFirst(selectedId, forward);
  breadthFirst(selectedId, backward).forEach(node => chain.add(node));
  return chain;
}
