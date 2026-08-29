import { describe, expect, it } from "vitest";
import { buildPqcReadinessModel } from "./pqcReadiness";

describe("buildPqcReadinessModel", () => {
  it("derives PQC readiness metrics and orders only quantum-vulnerable generated actions", () => {
    const model = buildPqcReadinessModel({
      displayName: "Treasury estate",
      totalAssets: 3,
      quantumReadiness: 72,
      usingSavedScan: true,
      findings: [
        { findingKey: "rsa", assetName: "Gateway", algorithm: "RSA-2048", cryptoRole: "Key establishment", riskLevel: "Critical", quantumVulnerable: true, hndlExposure: true },
        { findingKey: "ecc", assetName: "Signer", algorithm: "ECDSA P-384", cryptoRole: "Signature", riskLevel: "High", quantumVulnerable: true, hndlExposure: false },
        { findingKey: "aes", assetName: "Vault", algorithm: "AES-256-GCM", cryptoRole: "Encryption", riskLevel: "Low", quantumVulnerable: false, hndlExposure: false },
      ],
      recommendations: [
        { findingKey: "ecc", title: "Migrate signer", candidate: "ML-DSA-87", priority: 2 },
        { findingKey: "rsa", title: "Migrate gateway", candidate: "ML-KEM-768", priority: 1 },
        { findingKey: "aes", title: "Rotate vault", candidate: "Crypto agility", priority: 0 },
      ],
    });

    expect(model.assessment).toMatchObject({ name: "Treasury estate", readiness: 72, source: "Saved assessment" });
    expect(model.counts).toMatchObject({ rsa: 1, ecc: 1, quantumVulnerable: 2, hndl: 1, highRisk: 2, lowerExposure: 1 });
    expect(model.riskDistribution).toEqual({ high: { count: 2, percent: 67 }, medium: { count: 0, percent: 0 }, low: { count: 1, percent: 33 } });
    expect(model.actions.map(entry => entry.recommendation.findingKey)).toEqual(["rsa", "ecc"]);
  });
});
