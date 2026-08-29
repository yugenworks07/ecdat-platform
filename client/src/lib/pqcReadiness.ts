export type PqcReadinessFinding = {
  findingKey: string;
  assetName: string;
  algorithm: string;
  cryptoRole: string;
  riskLevel: string;
  quantumVulnerable: boolean;
  hndlExposure: boolean;
};

export type PqcReadinessRecommendation = {
  findingKey: string;
  title: string;
  candidate: string;
  priority: number;
};

export type PqcReadinessInput = {
  displayName: string;
  totalAssets: number;
  quantumReadiness: number;
  findings: PqcReadinessFinding[];
  recommendations: PqcReadinessRecommendation[];
  usingSavedScan: boolean;
};

const riskRank: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

function isRsa(finding: PqcReadinessFinding) { return /\brsa\b|rsa[-_ ]?\d*/i.test(finding.algorithm); }
function isEcc(finding: PqcReadinessFinding) { return /ecdsa|ecdh|ed25519|x25519|\becc\b|elliptic/i.test(finding.algorithm); }

export function buildPqcReadinessModel(input: PqcReadinessInput) {
  const findingByKey = new Map(input.findings.map(finding => [finding.findingKey, finding]));
  const quantumVulnerable = input.findings.filter(finding => finding.quantumVulnerable);
  const highRisk = input.findings.filter(finding => finding.riskLevel === "Critical" || finding.riskLevel === "High").length;
  const mediumRisk = input.findings.filter(finding => finding.riskLevel === "Medium").length;
  const lowRisk = input.findings.filter(finding => finding.riskLevel === "Low").length;
  const totalClassified = Math.max(1, highRisk + mediumRisk + lowRisk);
  const prioritizedActions = input.recommendations
    .map(recommendation => ({ recommendation, finding: findingByKey.get(recommendation.findingKey) }))
    .filter((entry): entry is { recommendation: PqcReadinessRecommendation; finding: PqcReadinessFinding } => Boolean(entry.finding?.quantumVulnerable))
    .sort((left, right) => left.recommendation.priority - right.recommendation.priority
      || (riskRank[right.finding.riskLevel] ?? 0) - (riskRank[left.finding.riskLevel] ?? 0)
      || left.finding.assetName.localeCompare(right.finding.assetName))
    .slice(0, 4);

  return {
    assessment: {
      name: input.displayName,
      source: input.usingSavedScan ? "Saved assessment" : "Seeded preview",
      readiness: Math.max(0, Math.min(100, input.quantumReadiness)),
      totalAssets: input.totalAssets || input.findings.length,
    },
    counts: {
      rsa: input.findings.filter(isRsa).length,
      ecc: input.findings.filter(isEcc).length,
      quantumVulnerable: quantumVulnerable.length,
      hndl: input.findings.filter(finding => finding.hndlExposure).length,
      highRisk,
      lowerExposure: input.findings.filter(finding => !finding.quantumVulnerable && finding.riskLevel !== "Critical" && finding.riskLevel !== "High").length,
    },
    riskDistribution: {
      high: { count: highRisk, percent: Math.round((highRisk / totalClassified) * 100) },
      medium: { count: mediumRisk, percent: Math.round((mediumRisk / totalClassified) * 100) },
      low: { count: lowRisk, percent: Math.round((lowRisk / totalClassified) * 100) },
    },
    actions: prioritizedActions,
  };
}
