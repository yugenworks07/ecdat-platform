import { describe, expect, it } from "vitest";
import { buildMigrationCandidates, moscaDecision, planningWaves, priorityBand, priorityCounts } from "./migrationInsights";

const finding = {
  findingKey: "rsa",
  assetName: "Payment TLS",
  algorithm: "RSA-2048",
  library: "OpenSSL",
  version: "3",
  usageContext: "External TLS",
  sourceLocation: "tls.ts:7",
  confidence: 92,
  provenance: "scanner",
  cryptoRole: "Key exchange",
  dataState: "In transit",
  environment: "Production",
  sensitivity: "High",
  criticality: "Critical",
  classicalRisk: "High",
  quantumRisk: "High",
  dataLifetimeYears: 15,
  migrationMonths: 18,
  quantumVulnerable: true,
  hndlExposure: true,
  riskLevel: "Critical",
};

const recommendation = {
  findingKey: "rsa",
  title: "Migrate transport",
  candidate: "X25519 + ML-KEM-1024",
  migrationNotes: "Validate peers",
  compatibility: "Review required",
  indicativeEffort: "Indicative: 4–8 engineer-weeks",
  indicativeLatency: "Indicative: +2 ms",
  priority: 1,
};

describe("migration decision insights", () => {
  it("creates an explainable priority candidate from observed finding, recommendation, and relationship evidence", () => {
    const candidates = buildMigrationCandidates({ findings: [finding], recommendations: [recommendation], relationships: [{ sourceNode: "service:Payment", targetNode: "algorithm:RSA-2048", relationship: "PROTECTS", evidence: "observed", confidence: 90 }] });
    expect(candidates[0]).toMatchObject({ priorityBand: "P1", effortLabel: "High", finding: { findingKey: "rsa" }, recommendation: { candidate: "X25519 + ML-KEM-1024" } });
    expect(candidates[0]?.urgency).toBeGreaterThanOrEqual(4);
    expect(priorityCounts(candidates)).toMatchObject({ P1: 1, P2: 0 });
  });

  it("keeps priority bands bounded and makes the Mosca planning condition explicit", () => {
    expect(priorityBand(12)).toBe("P4");
    expect(moscaDecision(finding, 9)).toMatchObject({ status: "Planning condition present", margin: 7.5 });
  });

  it("prepends a clearly labelled preparation construct to scan-derived migration waves", () => {
    expect(planningWaves([{ wave: 1, title: "Urgent", rationale: "risk", scope: "scope", indicativeEffort: "4–8 engineer-weeks", dependencies: "gate" }])).toMatchObject([{ wave: 0, title: "Prepare", isPlanningConstruct: true }, { wave: 1, title: "Urgent", isPlanningConstruct: false }]);
  });
});
