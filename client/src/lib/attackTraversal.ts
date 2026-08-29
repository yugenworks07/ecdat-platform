export type AttackPosition = [number, number, number];

export type AttackGraphNode = {
  id: string;
  position: AttackPosition;
};

export type AttackGraphEdge = {
  source: string;
  target: string;
};

export type AttackStep = {
  fromId: string;
  toId: string;
  fromPos: AttackPosition;
  toPos: AttackPosition;
};

export type AttackResult = {
  hitNodes: string[];
  hitEdges: Array<[string, string]>;
  totalSteps: number;
};

export const attackEdgeKey = (source: string, target: string) => [source, target].sort().join("::");

export function buildAttackPath(sourceId: string, edges: AttackGraphEdge[], nodeMap: Map<string, AttackGraphNode>, maxSteps = 30): AttackStep[] {
  if (!nodeMap.has(sourceId) || maxSteps <= 0) return [];
  const visited = new Set<string>([sourceId]);
  const queue = [sourceId];
  const steps: AttackStep[] = [];

  while (queue.length > 0 && steps.length < maxSteps) {
    const current = queue.shift();
    if (!current) break;
    for (const edge of edges) {
      const neighbor = edge.source === current ? edge.target : edge.target === current ? edge.source : undefined;
      if (!neighbor || visited.has(neighbor) || !nodeMap.has(neighbor)) continue;
      const fromNode = nodeMap.get(current);
      const toNode = nodeMap.get(neighbor);
      if (!fromNode || !toNode) continue;
      visited.add(neighbor);
      steps.push({ fromId: current, toId: neighbor, fromPos: fromNode.position, toPos: toNode.position });
      queue.push(neighbor);
      if (steps.length >= maxSteps) break;
    }
  }
  return steps;
}

export function buildAttackResult(sourceId: string, steps: AttackStep[]): AttackResult {
  const hitNodes = sourceId ? [sourceId, ...steps.map(step => step.toId)] : [];
  return { hitNodes: Array.from(new Set(hitNodes)), hitEdges: steps.map(step => [step.fromId, step.toId]), totalSteps: steps.length };
}
