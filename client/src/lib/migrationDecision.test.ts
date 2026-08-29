import { describe, expect, it } from "vitest";
import { buildMigrationDecisionModel, decisionBand, defaultQuantumScenarioYears } from "./migrationDecision";
import type { MigrationCandidate } from "./migrationInsights";

const candidate = {
  finding: {
    riskLevel: "critical",
    criticality: "critical",
    quantumVulnerable: true,
    hndlExposure: true,
    dataLifetimeYears: 10,
    migrationMonths: 36,
  },
  recommendation: { candidate: "ML-KEM-768" },
} as MigrationCandidate;

describe("migration decision intelligence", () => {
  it("derives an explainable critical decision for a constrained quantum scenario", () => {
    const model = buildMigrationDecisionModel(candidate, 8);
    expect(model.score).toBe(100);
    expect(model.band).toBe("Critical");
    expect(model.marginYears).toBe(5);
    expect(model.target).toBe("ML-KEM-768");
    expect(model.why).toHaveLength(4);
  });

  it("updates the risk decision when the interactive scenario horizon changes", () => {
    const near = buildMigrationDecisionModel(candidate, 8);
    const distant = buildMigrationDecisionModel(candidate, 20);
    expect(near.score).toBeGreaterThan(distant.score);
    expect(decisionBand(30)).toBe("Monitor");
    expect(decisionBand(31)).toBe("Elevated");
    expect(decisionBand(61)).toBe("High");
    expect(defaultQuantumScenarioYears(candidate)).toBe(8);
  });
});
