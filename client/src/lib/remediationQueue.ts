export type RemediationQueueFinding = {
  findingKey: string;
  riskLevel: string;
  confidence: number;
  quantumVulnerable: boolean;
};

export const remediationSeverityOrder: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

export function rankRemediationFindings<T extends RemediationQueueFinding>(findings: readonly T[], visibleLevels: ReadonlySet<string>) {
  return findings
    .filter(finding => visibleLevels.has(finding.riskLevel))
    .sort((left, right) => remediationSeverityOrder[right.riskLevel] - remediationSeverityOrder[left.riskLevel] || right.confidence - left.confidence);
}
