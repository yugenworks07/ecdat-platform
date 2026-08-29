import { describe, expect, it } from "vitest";
import { buildEvidenceGraphLayout, sortInventoryFindings } from "./explorationUtils";

describe("exploration utilities", () => {
  it("sorts observed CBOM findings by evidence-backed risk and confidence", () => {
    const findings = [
      { algorithm: "AES", riskLevel: "Medium", criticality: "High", confidence: 82 },
      { algorithm: "RSA", riskLevel: "Critical", criticality: "Critical", confidence: 94 },
    ];
    expect(sortInventoryFindings(findings, "risk", "desc").map(item => item.algorithm)).toEqual(["RSA", "AES"]);
    expect(sortInventoryFindings(findings, "confidence", "asc").map(item => item.algorithm)).toEqual(["AES", "RSA"]);
  });

  it("builds a deterministic kind-aware evidence graph layout", () => {
    const layout = buildEvidenceGraphLayout([{ id: "library:z", kind: "library" }, { id: "service:a", kind: "service" }, { id: "algorithm:b", kind: "algorithm" }]);
    expect(layout.map(item => item.id)).toEqual(["service:a", "algorithm:b", "library:z"]);
    expect(layout[0]?.x).toBeLessThan(layout[1]?.x ?? 0);
  });
});
