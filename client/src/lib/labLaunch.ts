type LabLaunchableFinding = {
  findingKey: string;
  algorithm: string;
  library?: string | null;
  cryptoRole: string;
  riskLevel: string;
  quantumVulnerable: boolean;
  hndlExposure: boolean;
  sourceLocation: string;
  dataLifetimeYears: number;
  migrationMonths: number;
  confidence: number;
};

function routePart(value: string | undefined, fallback: string) {
  const normalized = value?.trim().replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return normalized || fallback;
}

export function openFindingInLab(finding: LabLaunchableFinding) {
  const scanId = "scan-104";
  window.open(`/remediation-lab.html?scanId=${encodeURIComponent(routePart(scanId, "scan-104"))}&findingId=${encodeURIComponent(routePart(finding.findingKey, "finding-rsa-017"))}`, "_blank", "noopener,noreferrer");
}

export function remediationQueueUrl(scanKey?: string | null) {
  return `/remediation-queue/${encodeURIComponent(scanKey?.trim() || "scan-104")}`;
}
