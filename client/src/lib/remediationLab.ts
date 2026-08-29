export type LabFindingInput = {
  findingKey: string;
  assetName: string;
  algorithm: string;
  library: string | null;
  version: string | null;
  cryptoRole: string;
  riskLevel: string;
  sourceLocation: string;
  confidence: number;
  dataLifetimeYears: number;
  migrationMonths: number;
  quantumVulnerable: boolean;
  hndlExposure: boolean;
};

export type LabRecommendationInput = {
  findingKey: string;
  candidate: string;
  title: string;
  migrationNotes: string;
  compatibility: string;
  indicativeEffort: string;
  indicativeLatency: string;
};

export type RemediationContext = {
  scanId: string;
  findingId: string;
  workspaceId: string;
  finding: LabFindingInput;
  candidate: string;
  riskScore: number;
  riskAfter: number;
  impactedServices: string[];
  migrationPlan: Array<{ title: string; effort: string; impacted: number; status: "Ready" | "Manual action" | "Future"; description: string; rationale: string }>;
};

export const phases = [
  { id: 1, label: "Evidence", title: "Evidence & impact", short: "Evidence" },
  { id: 2, label: "Plan", title: "Migration plan", short: "Plan" },
  { id: 3, label: "Review", title: "Review proposed change", short: "Review" },
  { id: 4, label: "Validate", title: "Validate in workspace", short: "Validate" },
  { id: 5, label: "Verify", title: "Verify & prove", short: "Verify" },
] as const;

export const fallbackFinding: LabFindingInput = {
  findingKey: "finding-rsa-017",
  assetName: "auth-service",
  algorithm: "RSA-2048",
  library: "OpenSSL",
  version: "1.1.1",
  cryptoRole: "Key exchange",
  riskLevel: "Critical",
  sourceLocation: "auth-service/config/tls.yaml:42",
  confidence: 94,
  dataLifetimeYears: 10,
  migrationMonths: 24,
  quantumVulnerable: true,
  hndlExposure: true,
};

export function riskScoreFor(level: string, quantumVulnerable: boolean) {
  if (level === "Critical") return 82;
  if (level === "High") return 68;
  if (level === "Medium") return 43;
  return quantumVulnerable ? 31 : 18;
}

export function routePart(value: string | undefined, fallback: string) {
  const normalized = value?.trim().replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return normalized || fallback;
}

export function buildRemediationContext({
  scanId,
  findingId,
  finding,
  recommendation,
  relationshipCount,
}: {
  scanId?: string;
  findingId?: string;
  finding?: LabFindingInput;
  recommendation?: LabRecommendationInput;
  relationshipCount?: number;
}): RemediationContext {
  const resolvedFinding = finding ?? fallbackFinding;
  const resolvedScan = routePart(scanId, "scan-104");
  const resolvedFindingId = routePart(findingId, routePart(resolvedFinding.findingKey, "finding-rsa-017"));
  const candidate = recommendation?.candidate || "Hybrid RSA-2048 + ML-KEM-768";
  const riskScore = riskScoreFor(resolvedFinding.riskLevel, resolvedFinding.quantumVulnerable);
  const impacted = Math.max(relationshipCount ?? 3, 1);

  return {
    scanId: resolvedScan,
    findingId: resolvedFindingId,
    workspaceId: `RL-${resolvedScan.replace(/\D/g, "").slice(-3) || "104"}-${resolvedFindingId.replace(/\D/g, "").slice(-3) || "017"}`,
    finding: resolvedFinding,
    candidate,
    riskScore,
    riskAfter: Math.max(12, riskScore - 48),
    impactedServices: [resolvedFinding.assetName, "payment-api", "user-profile", "notification-service"].slice(0, Math.min(4, impacted + 1)),
    migrationPlan: [
      { title: "Prepare PQC-compatible library", effort: "Low", impacted: 0, status: "Ready", description: `Upgrade ${resolvedFinding.library || "the cryptographic library"} to a version that supports the recommended PQC provider in the isolated workspace.`, rationale: "The hybrid migration requires a provider capable of negotiating the proposed algorithm." },
      { title: "Introduce hybrid negotiation", effort: "Medium", impacted: 1, status: "Ready", description: `Configure ${resolvedFinding.assetName} to support ${resolvedFinding.algorithm} and ${candidate} during the compatibility window.`, rationale: "A hybrid path preserves compatibility while evidence is collected from dependent services." },
      { title: "Validate dependent services", effort: "Medium", impacted: Math.min(2, impacted), status: "Manual action", description: "Verify dependent-service negotiation and integration behavior in an approved test environment.", rationale: "Shared service paths require explicitly observed compatibility evidence before legacy retirement." },
      { title: "Retire legacy-only path", effort: "Low", impacted: 0, status: "Future", description: `Only after validation, remove ${resolvedFinding.algorithm}-only negotiation from the isolated workspace configuration.`, rationale: "The retirement action remains blocked until the hybrid path has been verified." },
    ],
  };
}

export function canEnterPhase(target: number, unlocked: number) {
  return target <= unlocked;
}

export function phasePath(context: RemediationContext, phase: number) {
  const suffix = phases[phase - 1]?.short.toLowerCase() ?? "evidence";
  return `/remediation-lab/${context.scanId}/${context.findingId}/${suffix}`;
}

export function remediationLabPath(context: Pick<RemediationContext, "scanId" | "findingId">) {
  return `/remediation-lab/${context.scanId}/${context.findingId}`;
}

export function remediationLabWindowPath(context: Pick<RemediationContext, "scanId" | "findingId">) {
  return `/remediation-lab.html?scanId=${encodeURIComponent(routePart(context.scanId, "scan-104"))}&findingId=${encodeURIComponent(routePart(context.findingId, "finding-rsa-017"))}`;
}
