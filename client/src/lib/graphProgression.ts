import { computeBlastRadius, computeChain, type GraphRelationship } from "./graphUtils";

export type ProgressiveGraphMode = "overview" | "explore" | "impact";

export type GraphSourceFinding = {
  findingKey: string;
  sourceLocation?: string | null;
};

export function graphScopeForMode(mode: ProgressiveGraphMode, selectedId: string | null, relationships: GraphRelationship[]) {
  if (!selectedId || mode === "overview") return new Set<string>();
  return mode === "impact" ? computeBlastRadius(selectedId, relationships).nodeIds : computeChain(selectedId, relationships);
}

export function sourceEvidenceLeaves(findingKeys: string[], findings: GraphSourceFinding[], limit = 6) {
  const allowed = new Set(findingKeys);
  return findings
    .filter(finding => allowed.has(finding.findingKey) && finding.sourceLocation)
    .slice(0, limit)
    .map(finding => ({
      id: `evidence:${finding.findingKey}`,
      findingKey: finding.findingKey,
      label: finding.sourceLocation!.split(/[\\/]/).filter(Boolean).slice(-2).join("/") || finding.sourceLocation!,
    }));
}
