import { describe, expect, it } from "vitest";
import { buildCycloneDxOrientedCbom } from "./ecdatExport";

describe("buildCycloneDxOrientedCbom", () => {
  it("uses a CycloneDX 1.6 document identity and preserves scan-backed crypto evidence", () => {
    const cbom = buildCycloneDxOrientedCbom({
      scanKey: "scan_cryptography_2026",
      displayName: "Cryptography service",
      createdAt: "2026-08-26T00:00:00.000Z",
      findings: [{ findingKey: "repo-rsa-1", assetName: "src/keys.ts", assetType: "Source file", algorithm: "RSA", cryptoRole: "Signature", library: "Node.js crypto", version: null, sourceLocation: "src/keys.ts:12", usageContext: "RSA signature", confidence: 92, evidence: "Static source evidence", provenance: "Bounded text analysis", riskLevel: "High", quantumRisk: "High" }],
    });
    expect(cbom).toMatchObject({ bomFormat: "CycloneDX", specVersion: "1.6", version: 1 });
    expect(cbom.serialNumber).toMatch(/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(cbom.components[0]).toMatchObject({ "bom-ref": "repo-rsa-1", type: "cryptographic-asset", name: "src/keys.ts" });
    expect(cbom.components[0]?.properties).toEqual(expect.arrayContaining([{ name: "org.ecdat:algorithm", value: "RSA" }, { name: "org.ecdat:provenance", value: "Bounded text analysis" }]));
  });
});
