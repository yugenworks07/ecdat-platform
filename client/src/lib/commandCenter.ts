export type CommandCenterFinding = {
  findingKey: string;
  assetName: string;
  algorithm: string;
  library: string | null;
  version: string | null;
  riskLevel: string;
  quantumRisk: string;
  quantumVulnerable: boolean;
  hndlExposure: boolean;
  criticality: string;
};

export type CommandCenterRecommendation = {
  findingKey: string;
  title: string;
  candidate: string;
  priority: number;
};

export type CommandCenterRecentScan = {
  scanKey: string;
  displayName: string;
  totalAssets: number;
  status: string;
  createdAt: Date | string;
};

export type CommandCenterActiveScan = {
  displayName: string;
  totalAssets: number;
  quantumReadiness: number;
  findings: CommandCenterFinding[];
  recommendations: CommandCenterRecommendation[];
  relationships: Array<unknown>;
  usingSavedScan: boolean;
  repositoryOutcome?: { outcome: { kind: string; label: string; title: string; subtitle: string; readinessApplicable: boolean }; contextSignals: Array<{ id: string; label: string }>; coverageIncomplete: boolean };
};

const riskOrder: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const criticalityOrder: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const riskLevels = ["Critical", "High", "Medium", "Low"] as const;

export function buildCommandCenterViewModel(active: CommandCenterActiveScan, recentScans: CommandCenterRecentScan[] = []) {
  const riskCounts = Object.fromEntries(riskLevels.map(level => [level, 0])) as Record<(typeof riskLevels)[number], number>;
  const algorithms = new Map<string, number>();
  let quantumVulnerable = 0;
  let legacyMargin = 0;
  let lowerQuantumExposure = 0;
  let hndl = 0;

  for (const finding of active.findings) {
    const riskLevel = riskLevels.includes(finding.riskLevel as (typeof riskLevels)[number]) ? finding.riskLevel as (typeof riskLevels)[number] : "Low";
    riskCounts[riskLevel] += 1;
    const algorithm = finding.algorithm?.trim() || "Not observed";
    algorithms.set(algorithm, (algorithms.get(algorithm) ?? 0) + 1);
    if (finding.quantumVulnerable) quantumVulnerable += 1;
    else if (finding.quantumRisk === "Low") lowerQuantumExposure += 1;
    else legacyMargin += 1;
    if (finding.hndlExposure) hndl += 1;
  }

  const findingByKey = new Map(active.findings.map(finding => [finding.findingKey, finding]));
  const migrationCandidates = active.recommendations
    .map(recommendation => ({ recommendation, finding: findingByKey.get(recommendation.findingKey) }))
    .filter((item): item is { recommendation: CommandCenterRecommendation; finding: CommandCenterFinding } => Boolean(item.finding?.quantumVulnerable))
    .sort((left, right) => left.recommendation.priority - right.recommendation.priority
      || (riskOrder[right.finding.riskLevel] ?? 0) - (riskOrder[left.finding.riskLevel] ?? 0)
      || (criticalityOrder[right.finding.criticality] ?? 0) - (criticalityOrder[left.finding.criticality] ?? 0)
      || left.finding.algorithm.localeCompare(right.finding.algorithm))
    .slice(0, 5)
    .map(({ recommendation, finding }) => ({ ...recommendation, finding }));

  const algorithmDistribution = Array.from(algorithms.entries())
    .map(([algorithm, count]) => ({ algorithm, count, percentage: active.findings.length ? Math.round((count / active.findings.length) * 100) : 0 }))
    .sort((left, right) => right.count - left.count || left.algorithm.localeCompare(right.algorithm))
    .slice(0, 6);

  const findings = active.findings.length;
  const evidence = active.relationships.length;
  return {
    assessment: {
      displayName: active.displayName,
      source: active.usingSavedScan ? "Saved assessment" : "Seeded preview",
      readiness: active.quantumReadiness,
      findings,
      actions: active.recommendations.length,
      evidence,
      hndlDetected: hndl > 0,
      repositoryOutcome: active.repositoryOutcome,
    },
    kpis: {
      assets: active.totalAssets,
      critical: riskCounts.Critical,
      high: riskCounts.High,
      quantumVulnerable,
      hndl,
      readiness: active.quantumReadiness,
    },
    riskDistribution: riskLevels.map(level => ({ level, count: riskCounts[level] })),
    quantumExposure: {
      quantumVulnerable,
      legacyMargin,
      lowerQuantumExposure,
      total: findings,
      exposedPercentage: findings ? Math.round((quantumVulnerable / findings) * 100) : 0,
    },
    algorithmDistribution,
    migrationCandidates,
    recentScans: [...recentScans].slice(0, 5),
    activity: [
      { type: "success" as const, title: active.usingSavedScan ? "Saved scan context active" : "Seeded preview context active", detail: `${active.displayName} · ${findings} observed findings · ${evidence} evidence links` },
      ...(hndl > 0 ? [{ type: "warning" as const, title: "Potential HNDL signals require planning review", detail: `${hndl} observed finding${hndl === 1 ? "" : "s"} qualify under the current planning inputs.` }] : []),
      ...(migrationCandidates.length ? [{ type: "info" as const, title: "Migration candidates prioritised", detail: `${migrationCandidates.length} quantum-vulnerable finding${migrationCandidates.length === 1 ? "" : "s"} have generated paths.` }] : []),
    ],
  };
}
