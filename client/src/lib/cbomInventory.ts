import type { InventoryFinding } from "@/lib/inventoryUtils";

export const cbomSortKeys = ["risk", "asset", "algorithm", "role", "library", "version", "quantum", "confidence"] as const;
export type CbomSortKey = (typeof cbomSortKeys)[number];
export type CbomSortDirection = "asc" | "desc";
export type CbomFilters = { query: string; risk: string; quantum: string; hndl?: string; library?: string; minConfidence?: string };

const riskRank: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export function filterCbomFindings(findings: InventoryFinding[], filters: CbomFilters) {
  const query = filters.query.trim().toLowerCase();
  const minimumConfidence = filters.minConfidence && filters.minConfidence !== "all" ? Number(filters.minConfidence) : 0;
  return findings.filter(finding => {
    const searchable = [finding.assetName, finding.algorithm, finding.cryptoRole, finding.library, finding.version, finding.sourceLocation, finding.usageContext].filter(Boolean).join(" ").toLowerCase();
    const matchesHndl = !filters.hndl || filters.hndl === "all" || (filters.hndl === "qualified" ? finding.hndlExposure : !finding.hndlExposure);
    const matchesLibrary = !filters.library || filters.library === "all" || finding.library === filters.library;
    return (!query || searchable.includes(query)) && (filters.risk === "all" || finding.riskLevel === filters.risk) && (filters.quantum === "all" || (filters.quantum === "vulnerable" ? finding.quantumVulnerable : !finding.quantumVulnerable)) && matchesHndl && matchesLibrary && finding.confidence >= minimumConfidence;
  });
}

export function buildCbomPosture(findings: InventoryFinding[], totalAssets: number, relationships: Array<{ sourceNode: string; targetNode: string }>) {
  const nodes = Array.from(new Set(relationships.flatMap(relationship => [relationship.sourceNode, relationship.targetNode])));
  const relatedServices = nodes.filter(node => /^(service|endpoint):/i.test(node)).length;
  const relatedLibraries = new Set([
    ...findings.map(finding => finding.library).filter((library): library is string => Boolean(library)),
    ...nodes.filter(node => /^library:/i.test(node)).map(node => node.replace(/^library:/i, "")),
  ]).size;
  return {
    totalAssets,
    findings: findings.length,
    quantumVulnerable: findings.filter(finding => finding.quantumVulnerable).length,
    hndlExposed: findings.filter(finding => finding.hndlExposure).length,
    relatedServices,
    relatedLibraries,
  };
}

export function sortCbomFindings(findings: InventoryFinding[], key: CbomSortKey, direction: CbomSortDirection) {
  const value = (finding: InventoryFinding): string | number => {
    if (key === "risk") return riskRank[finding.riskLevel] ?? 0;
    if (key === "asset") return finding.assetName;
    if (key === "algorithm") return finding.algorithm;
    if (key === "role") return finding.cryptoRole;
    if (key === "library") return finding.library ?? "";
    if (key === "version") return finding.version ?? "";
    if (key === "quantum") return finding.quantumVulnerable ? 1 : 0;
    return finding.confidence;
  };
  return [...findings].sort((left, right) => {
    const leftValue = value(left); const rightValue = value(right);
    const comparison = typeof leftValue === "number" && typeof rightValue === "number" ? leftValue - rightValue : String(leftValue).localeCompare(String(rightValue));
    return direction === "asc" ? comparison : -comparison;
  });
}

export function paginateCbomFindings<T>(findings: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(findings.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  return { totalPages, currentPage, rows: findings.slice((currentPage - 1) * pageSize, currentPage * pageSize) };
}

export function cbomFindingFromSearch(search: string) {
  return new URLSearchParams(search).get("finding");
}
