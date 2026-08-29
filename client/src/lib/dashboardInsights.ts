export type DashboardInsightFinding = {
  findingKey: string;
  riskLevel: string;
  quantumRisk: string;
  quantumVulnerable: boolean;
  hndlExposure: boolean;
  confidence: number;
};

const riskWeights: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export function buildDashboardInsights(findings: DashboardInsightFinding[]) {
  const exposure = findings.reduce(
    (counts, finding) => {
      if (finding.quantumVulnerable) counts.quantumVulnerable += 1;
      else if (finding.quantumRisk === "Low") counts.lowerQuantumExposure += 1;
      else counts.legacyOrMonitor += 1;
      return counts;
    },
    { quantumVulnerable: 0, legacyOrMonitor: 0, lowerQuantumExposure: 0 }
  );
  let accumulated = 0;
  const evidenceSignal = [...findings]
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 6)
    .map((finding, index) => {
      accumulated += (riskWeights[finding.riskLevel] ?? 1) * 20;
      return {
        label: `E${index + 1}`,
        value: Math.min(100, Math.round(accumulated / (index + 1))),
        findingKey: finding.findingKey,
      };
    });
  return { exposure, evidenceSignal };
}
