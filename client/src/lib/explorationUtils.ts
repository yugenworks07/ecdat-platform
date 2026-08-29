export type InventorySortKey = "risk" | "algorithm" | "criticality" | "confidence";

export type InventorySortFinding = {
  algorithm: string;
  riskLevel: string;
  criticality: string;
  confidence: number;
};

const rank: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export function sortInventoryFindings<T extends InventorySortFinding>(findings: T[], key: InventorySortKey, direction: "asc" | "desc") {
  const sorted = [...findings].sort((left, right) => {
    const comparison = key === "algorithm" ? left.algorithm.localeCompare(right.algorithm)
      : key === "confidence" ? left.confidence - right.confidence
      : key === "risk" ? (rank[left.riskLevel] ?? 0) - (rank[right.riskLevel] ?? 0)
      : (rank[left.criticality] ?? 0) - (rank[right.criticality] ?? 0);
    return direction === "asc" ? comparison : -comparison;
  });
  return sorted;
}

export type LayoutNode = { id: string; kind: string };
export type LayoutPosition = LayoutNode & { x: number; y: number };

const layoutOrder = ["service", "endpoint", "asset", "algorithm", "library", "certificate", "certificate-authority", "data"];

export function buildEvidenceGraphLayout(nodes: LayoutNode[]): LayoutPosition[] {
  const kinds = Array.from(new Set(nodes.map(node => node.kind))).sort((left, right) => {
    const leftRank = layoutOrder.indexOf(left);
    const rightRank = layoutOrder.indexOf(right);
    return (leftRank < 0 ? layoutOrder.length : leftRank) - (rightRank < 0 ? layoutOrder.length : rightRank) || left.localeCompare(right);
  });
  const groups = new Map(kinds.map(kind => [kind, nodes.filter(node => node.kind === kind).sort((left, right) => left.id.localeCompare(right.id))]));
  return kinds.flatMap((kind, column) => {
    const group = groups.get(kind) ?? [];
    return group.map((node, row) => ({
      ...node,
      x: 90 + column * (780 / Math.max(kinds.length - 1, 1)),
      y: 72 + ((row + 1) * (460 / (group.length + 1))),
    }));
  });
}
