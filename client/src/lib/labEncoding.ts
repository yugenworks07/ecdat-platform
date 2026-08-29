export type LabFinding = {
  findingKey: string;
  algorithm: string;
  library: string;
  cryptoRole: string;
  riskLevel: string;
  quantumVulnerable: boolean;
  hndlExposure: boolean;
  sourceLocation: string;
  dataLifetimeYears: number;
  migrationMonths: number;
  confidence: number;
};

function encodeBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, character => character.charCodeAt(0)));
}

function isLabFinding(value: unknown): value is LabFinding {
  if (!value || typeof value !== "object") return false;
  const finding = value as Record<string, unknown>;
  return ["findingKey", "algorithm", "library", "cryptoRole", "riskLevel", "sourceLocation"].every(key => typeof finding[key] === "string") && ["quantumVulnerable", "hndlExposure"].every(key => typeof finding[key] === "boolean") && ["dataLifetimeYears", "migrationMonths", "confidence"].every(key => typeof finding[key] === "number");
}

export function trimFinding(finding: LabFinding): LabFinding {
  return { findingKey: finding.findingKey, algorithm: finding.algorithm, library: finding.library || "Not observed", cryptoRole: finding.cryptoRole, riskLevel: finding.riskLevel, quantumVulnerable: finding.quantumVulnerable, hndlExposure: finding.hndlExposure, sourceLocation: finding.sourceLocation, dataLifetimeYears: finding.dataLifetimeYears, migrationMonths: finding.migrationMonths, confidence: finding.confidence };
}

export function encodeFinding(finding: LabFinding) {
  return encodeBase64Url(JSON.stringify(trimFinding(finding)));
}

export function decodeFinding(value: string): LabFinding | null {
  try {
    const raw = value.replace(/^#?f=/, "");
    const parsed = JSON.parse(decodeBase64Url(raw));
    return isLabFinding(parsed) ? parsed : null;
  } catch { return null; }
}

export function labUrlForFinding(finding: LabFinding) {
  return `/lab.html#f=${encodeFinding(finding)}`;
}
