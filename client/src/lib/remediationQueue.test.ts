import { describe, expect, it } from "vitest";
import { riskScoreFor } from "./remediationLab";
import { rankRemediationFindings } from "./remediationQueue";

const findings = [
  { findingKey: "medium", riskLevel: "Medium", confidence: 96, quantumVulnerable: false },
  { findingKey: "critical-low", riskLevel: "Critical", confidence: 71, quantumVulnerable: true },
  { findingKey: "critical-high", riskLevel: "Critical", confidence: 94, quantumVulnerable: true },
  { findingKey: "low", riskLevel: "Low", confidence: 99, quantumVulnerable: false },
];

describe("Remediation Queue", () => {
  it("filters selected severity levels and ranks by severity then confidence", () => {
    const ranked = rankRemediationFindings(findings, new Set(["Critical", "Medium"]));
    expect(ranked.map(finding => finding.findingKey)).toEqual(["critical-high", "critical-low", "medium"]);
  });

  it("uses stable, explainable queue risk scores", () => {
    expect(riskScoreFor("Critical", true)).toBe(82);
    expect(riskScoreFor("Low", true)).toBe(31);
    expect(riskScoreFor("Low", false)).toBe(18);
  });
});
