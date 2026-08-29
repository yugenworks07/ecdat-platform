export const repositoryOutcomeKinds = ["risk-identified", "inventory-no-urgent-pqc", "context-review", "not-applicable"] as const;

export type RepositoryOutcomeKind = (typeof repositoryOutcomeKinds)[number];

export type RepositoryContextSignal = {
  id: "authentication" | "data-store" | "file-storage" | "external-service" | "environment-reference";
  label: string;
};

export type RepositoryOutcome = {
  kind: RepositoryOutcomeKind;
  label: string;
  title: string;
  subtitle: string;
  readinessApplicable: boolean;
};

const outcomeByKind: Record<RepositoryOutcomeKind, RepositoryOutcome> = {
  "risk-identified": { kind: "risk-identified", label: "Cryptographic risk identified", title: "Cryptographic assets discovered", subtitle: "Analysis required", readinessApplicable: true },
  "inventory-no-urgent-pqc": { kind: "inventory-no-urgent-pqc", label: "Cryptographic assets inventoried — no urgent PQC migration", title: "Cryptographic assets discovered", subtitle: "No urgent PQC migration identified in the scanned scope", readinessApplicable: true },
  "context-review": { kind: "context-review", label: "No crypto detected — environment and infrastructure review recommended", title: "No cryptographic implementation detected", subtitle: "Context review recommended", readinessApplicable: false },
  "not-applicable": { kind: "not-applicable", label: "Cryptography not applicable for current scope", title: "Cryptography not applicable for the scanned scope", subtitle: "No application-level cryptographic remediation required", readinessApplicable: false },
};

export function repositoryOutcomeForKind(kind: RepositoryOutcomeKind) {
  return outcomeByKind[kind];
}

export function classifyRepositoryOutcome(input: {
  findings: Array<{ quantumVulnerable: boolean; classicalRisk: string }>;
  contextSignals: RepositoryContextSignal[];
}): RepositoryOutcome {
  const riskFindings = input.findings.filter(finding => finding.quantumVulnerable || finding.classicalRisk === "High");
  if (riskFindings.length) {
    return repositoryOutcomeForKind("risk-identified");
  }
  if (input.findings.length) {
    return repositoryOutcomeForKind("inventory-no-urgent-pqc");
  }
  if (input.contextSignals.length) {
    return repositoryOutcomeForKind("context-review");
  }
  return repositoryOutcomeForKind("not-applicable");
}

export function coverageLabel(coverageIncomplete: boolean) {
  return coverageIncomplete ? "Discovery coverage incomplete" : "Discovery coverage bounded";
}
