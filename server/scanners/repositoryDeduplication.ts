import type { SeedFinding } from "../ecdatSeed";

function mergeDistinct(values: string[], maximumLength: number) {
  const combined = Array.from(new Set(values.filter(Boolean))).join(" | ");
  return combined.length <= maximumLength ? combined : `${combined.slice(0, Math.max(0, maximumLength - 1))}…`;
}

export function deduplicateRepositoryFindings(findings: SeedFinding[]) {
  const grouped = new Map<string, SeedFinding[]>();
  for (const finding of findings) {
    const key = [finding.assetName, finding.assetType, finding.algorithm, finding.cryptoRole, finding.library ?? ""].join("\u0000");
    grouped.set(key, [...(grouped.get(key) ?? []), finding]);
  }

  return Array.from(grouped.values(), group => {
    const primary = [...group].sort((left, right) => right.confidence - left.confidence)[0]!;
    if (group.length === 1) return primary;
    return {
      ...primary,
      confidence: Math.max(...group.map(finding => finding.confidence)),
      sourceLocation: mergeDistinct(group.map(finding => finding.sourceLocation), 255),
      evidence: mergeDistinct(group.map(finding => finding.evidence), 8_000),
      provenance: mergeDistinct(group.map(finding => finding.provenance), 2_000),
    };
  });
}
