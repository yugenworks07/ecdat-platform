import { describe, expect, it } from "vitest";
import { buildDashboardInsights } from "./dashboardInsights";

describe("dashboard insights", () => {
  it("derives exclusive quantum-exposure composition and evidence signal from findings", () => {
    const result = buildDashboardInsights([
      { findingKey: "critical", riskLevel: "Critical", quantumRisk: "High", quantumVulnerable: true, hndlExposure: true, confidence: 80 },
      { findingKey: "monitor", riskLevel: "Medium", quantumRisk: "Medium", quantumVulnerable: false, hndlExposure: false, confidence: 95 },
      { findingKey: "lower", riskLevel: "Low", quantumRisk: "Low", quantumVulnerable: false, hndlExposure: false, confidence: 60 },
    ]);
    expect(result.exposure).toEqual({ quantumVulnerable: 1, legacyOrMonitor: 1, lowerQuantumExposure: 1 });
    expect(result.evidenceSignal).toHaveLength(3);
    expect(result.evidenceSignal[0]).toMatchObject({ label: "E1", findingKey: "monitor" });
  });
});
