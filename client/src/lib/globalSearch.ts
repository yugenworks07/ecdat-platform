export type SearchFinding = { findingKey: string; assetName: string; algorithm: string; riskLevel: string; quantumVulnerable: boolean; hndlExposure: boolean };
export type SearchRecommendation = { findingKey: string; title: string; candidate: string; priority: number };
export type GlobalSearchItem = { group: "Navigate" | "Observed evidence" | "Generated guidance"; label: string; detail: string; path: string; value: string };

const navigation: GlobalSearchItem[] = [
  { group: "Navigate", label: "Command center", detail: "Active scan posture and intake", path: "/", value: "command center dashboard" },
  { group: "Navigate", label: "CBOM inventory", detail: "Evidence-backed cryptographic assets", path: "/inventory", value: "inventory cbom assets" },
  { group: "Navigate", label: "Dependency graph", detail: "Observed relationship intelligence", path: "/graph", value: "dependency graph relationships" },
  { group: "Navigate", label: "Migration", detail: "PQC guidance, plan tracking, and dependency-aware execution", path: "/migration", value: "migration pqc guidance kanban roadmap" },
  { group: "Navigate", label: "PQC dashboard", detail: "Readiness signals and local ML-KEM / ML-DSA demonstrations", path: "/pqc-dashboard", value: "pqc post quantum dashboard readiness ml kem ml dsa hybrid" },
  { group: "Navigate", label: "Evidence & Reports", detail: "Assessment package, evidence chains, and exports", path: "/reports", value: "evidence reports export cbom assessment" },
];

export function buildGlobalSearchItems(findings: SearchFinding[], recommendations: SearchRecommendation[]) {
  const evidence = findings.map(finding => ({
    group: "Observed evidence" as const,
    label: finding.assetName,
    detail: `${finding.algorithm} · ${finding.riskLevel} risk${finding.hndlExposure ? " · potential HNDL" : ""}`,
    path: `/inventory?finding=${encodeURIComponent(finding.findingKey)}`,
    value: `${finding.assetName} ${finding.algorithm} ${finding.riskLevel}`,
  }));
  const guidance = recommendations.map(recommendation => ({
    group: "Generated guidance" as const,
    label: recommendation.title,
    detail: `Priority ${recommendation.priority} · ${recommendation.candidate}`,
    path: `/migration?finding=${encodeURIComponent(recommendation.findingKey)}`,
    value: `${recommendation.title} ${recommendation.candidate} ${recommendation.priority}`,
  }));
  return [...navigation, ...evidence, ...guidance];
}
