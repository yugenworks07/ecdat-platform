import { describe, expect, it } from "vitest";
import { classifyRepositoryOutcome, coverageLabel } from "./repositoryOutcome";

describe("repository outcomes", () => {
  it("marks observed quantum or high-classical-risk findings as cryptographic risk", () => {
    expect(classifyRepositoryOutcome({ findings: [{ quantumVulnerable: true, classicalRisk: "Low" }], contextSignals: [] }).kind).toBe("risk-identified");
    expect(classifyRepositoryOutcome({ findings: [{ quantumVulnerable: false, classicalRisk: "High" }], contextSignals: [] }).label).toBe("Cryptographic risk identified");
  });

  it("distinguishes inventoried crypto from no-crypto context review", () => {
    expect(classifyRepositoryOutcome({ findings: [{ quantumVulnerable: false, classicalRisk: "Low" }], contextSignals: [] }).kind).toBe("inventory-no-urgent-pqc");
    expect(classifyRepositoryOutcome({ findings: [], contextSignals: [{ id: "authentication", label: "Authentication referenced" }] })).toMatchObject({ kind: "context-review", readinessApplicable: false });
  });

  it("uses a non-certifying not-applicable state only when neither crypto nor sensitive context is observed", () => {
    expect(classifyRepositoryOutcome({ findings: [], contextSignals: [] })).toMatchObject({ kind: "not-applicable", readinessApplicable: false });
    expect(coverageLabel(true)).toBe("Discovery coverage incomplete");
  });
});
