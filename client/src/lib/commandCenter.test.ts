import { describe, expect, it } from "vitest";
import { buildCommandCenterViewModel } from "./commandCenter";

describe("buildCommandCenterViewModel", () => {
  it("reconciles finding-backed distributions and prioritises only quantum-vulnerable migration candidates", () => {
    const model = buildCommandCenterViewModel({
      displayName: "Evidence test scan",
      totalAssets: 12,
      quantumReadiness: 36,
      usingSavedScan: true,
      relationships: [{}, {}, {}],
      findings: [
        { findingKey: "rsa", assetName: "TLS", algorithm: "RSA-2048", library: "OpenSSL", version: "3", riskLevel: "Critical", quantumRisk: "High", quantumVulnerable: true, hndlExposure: true, criticality: "Critical" },
        { findingKey: "ecdsa", assetName: "Signer", algorithm: "ECDSA P-256", library: "JCA", version: "17", riskLevel: "High", quantumRisk: "High", quantumVulnerable: true, hndlExposure: false, criticality: "High" },
        { findingKey: "sha", assetName: "Verifier", algorithm: "SHA-1", library: null, version: null, riskLevel: "High", quantumRisk: "Medium", quantumVulnerable: false, hndlExposure: false, criticality: "Medium" },
        { findingKey: "aes", assetName: "Ledger", algorithm: "AES-256-GCM", library: null, version: null, riskLevel: "Low", quantumRisk: "Low", quantumVulnerable: false, hndlExposure: false, criticality: "High" },
      ],
      recommendations: [
        { findingKey: "ecdsa", title: "Hybrid signature", candidate: "ML-DSA", priority: 2 },
        { findingKey: "rsa", title: "Hybrid key exchange", candidate: "ML-KEM", priority: 1 },
        { findingKey: "sha", title: "Hash upgrade", candidate: "SHA-256", priority: 1 },
      ],
    });

    expect(model.riskDistribution.reduce((total, item) => total + item.count, 0)).toBe(4);
    expect(model.kpis).toMatchObject({ assets: 12, critical: 1, high: 2, quantumVulnerable: 2, hndl: 1, readiness: 36 });
    expect(model.quantumExposure).toMatchObject({ quantumVulnerable: 2, legacyMargin: 1, lowerQuantumExposure: 1, total: 4, exposedPercentage: 50 });
    expect(model.algorithmDistribution.reduce((total, item) => total + item.count, 0)).toBe(4);
    expect(model.migrationCandidates.map(item => item.finding.findingKey)).toEqual(["rsa", "ecdsa"]);
  });
});
