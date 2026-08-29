import { describe, expect, it } from "vitest";
import { deduplicateRepositoryFindings } from "./repositoryDeduplication";

const finding = {
  findingKey: "repo-source-1",
  assetName: "src/crypto.ts",
  assetType: "Source file",
  algorithm: "RSA",
  cryptoRole: "Signature",
  library: "Node.js crypto",
  version: null,
  sourceLocation: "repo@main:src/crypto.ts:12",
  usageContext: "Signature operation detected",
  dataState: "Not inferred from static analysis",
  environment: "Public source repository",
  sensitivity: "Not classified",
  criticality: "Not classified",
  riskLevel: "High",
  classicalRisk: "Low",
  quantumRisk: "High",
  quantumVulnerable: true,
  hndlExposure: false,
  dataLifetimeYears: 0,
  migrationMonths: 0,
  confidence: 76,
  evidence: "Static source match A",
  provenance: "Static analysis rule A",
};

describe("deduplicateRepositoryFindings", () => {
  it("keeps the highest confidence and combines duplicate evidence locations", () => {
    const output = deduplicateRepositoryFindings([finding, { ...finding, findingKey: "repo-source-2", sourceLocation: "repo@main:src/crypto.ts:20", confidence: 91, evidence: "Static source match B", provenance: "Static analysis rule B" }]);
    expect(output).toHaveLength(1);
    expect(output[0]).toMatchObject({ findingKey: "repo-source-2", confidence: 91 });
    expect(output[0]?.sourceLocation).toContain(":12");
    expect(output[0]?.sourceLocation).toContain(":20");
  });

  it("does not merge indirect evidence with a distinct asset type", () => {
    const output = deduplicateRepositoryFindings([finding, { ...finding, findingKey: "repo-manifest-1", assetName: "package.json", assetType: "Dependency manifest" }]);
    expect(output).toHaveLength(2);
  });
});
