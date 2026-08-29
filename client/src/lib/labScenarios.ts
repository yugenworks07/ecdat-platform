import type { LabFinding } from "@/lib/labEncoding";

export type LabScenario = {
  key: string;
  title: string;
  finding: LabFinding;
  observedCode: string;
  candidate: string;
  rationale: string;
  compatibility: string;
  effort: string;
  latency: string;
  diff: Array<{ type: "context" | "remove" | "add"; line: number; content: string }>;
  testNames: string[];
};

function candidateFor(algorithm: string) {
  if (/rsa/i.test(algorithm)) return "X25519 + ML-KEM-768";
  if (/ecdsa/i.test(algorithm)) return "ECDSA + ML-DSA-87";
  if (/aes/i.test(algorithm)) return "AES-256-GCM with a validated key-management path";
  return "Protocol-specific PQC migration candidate";
}

function scenarioFromFinding(finding: LabFinding, key = finding.findingKey): LabScenario {
  const candidate = candidateFor(finding.algorithm);
  return {
    key,
    title: `${finding.algorithm} · ${finding.cryptoRole}`,
    finding,
    observedCode: `// Observed reference: ${finding.sourceLocation}\n// Algorithm: ${finding.algorithm} (${finding.cryptoRole})`,
    candidate,
    rationale: `This is a simulated remediation workspace built from the supplied observed finding. Validate protocol, provider, and peer support before any production change.`,
    compatibility: `${finding.library || "Library not observed"} compatibility must be validated in an isolated integration path.`,
    effort: `${finding.migrationMonths} month indicative migration window`,
    latency: "No measured production latency is available.",
    diff: [
      { type: "context", line: 1, content: "// Simulated remediation illustration — no source repository was changed" },
      { type: "remove", line: 2, content: `algorithm: '${finding.algorithm}'` },
      { type: "add", line: 2, content: `algorithm: '${candidate}'` },
      { type: "context", line: 3, content: "// Validate fallback and interoperability before rollout" },
    ],
    testNames: ["Configuration parse (simulated)", "Compatibility path (simulated)", "Cryptographic policy check (simulated)", "ECDAT rescan review (simulated)"],
  };
}

export const labScenarios: Record<string, LabScenario> = {
  "rsa-key-exchange": scenarioFromFinding({ findingKey: "py-tls-rsa", algorithm: "RSA-2048", library: "OpenSSL 1.1.1", cryptoRole: "Key exchange", riskLevel: "Critical", quantumVulnerable: true, hndlExposure: true, sourceLocation: "src/config/tls.ts:42", dataLifetimeYears: 15, migrationMonths: 18, confidence: 94 }, "rsa-key-exchange"),
  "ecdsa-signature": scenarioFromFinding({ findingKey: "jwt-ecdsa-signature", algorithm: "ECDSA P-256", library: "PyJWT 2.8.0", cryptoRole: "Digital signature", riskLevel: "High", quantumVulnerable: true, hndlExposure: true, sourceLocation: "src/auth/tokens.py:88", dataLifetimeYears: 12, migrationMonths: 15, confidence: 96 }, "ecdsa-signature"),
  "aes-storage": scenarioFromFinding({ findingKey: "storage-aes", algorithm: "AES-128-GCM", library: "cryptography 42.0.5", cryptoRole: "Storage encryption", riskLevel: "Medium", quantumVulnerable: false, hndlExposure: false, sourceLocation: "src/storage/envelope.py:31", dataLifetimeYears: 7, migrationMonths: 9, confidence: 91 }, "aes-storage"),
};

export function buildScenarioFromFinding(finding: LabFinding) {
  return scenarioFromFinding(finding);
}
