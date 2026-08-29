import { describe, expect, it } from "vitest";
import { pqcGuidanceForFinding } from "./pqcGuidance";

const finding = { algorithm: "RSA-2048", cryptoRole: "Key establishment", quantumVulnerable: true, hndlExposure: true, dataLifetimeYears: 12, migrationMonths: 18 };

describe("PQC guidance", () => {
  it("maps observed signature evidence to the NIST signature standards", () => {
    const guidance = pqcGuidanceForFinding({ ...finding, algorithm: "ECDSA P-384", cryptoRole: "Signature" });
    expect(guidance.posture).toBe("signature");
    expect(guidance.standards.map(item => item.id)).toEqual(["FIPS 204", "FIPS 205"]);
  });

  it("maps key-establishment evidence to ML-KEM guidance", () => {
    const guidance = pqcGuidanceForFinding(finding);
    expect(guidance.posture).toBe("key-establishment");
    expect(guidance.standards[0]?.id).toBe("FIPS 203");
    expect(guidance.urgencySignals).toHaveLength(3);
  });

  it("does not claim an inferred PQC replacement for hash evidence", () => {
    const guidance = pqcGuidanceForFinding({ ...finding, algorithm: "SHA-256", cryptoRole: "Hash", quantumVulnerable: false, hndlExposure: false, dataLifetimeYears: 1, migrationMonths: 1 });
    expect(guidance.posture).toBe("hash-and-kdf");
    expect(guidance.standards).toEqual([]);
  });
});
