import { describe, expect, it } from "vitest";
import { runMlDsaDemo, runMlKemDemo } from "./pqcDemo";

describe("PQC demonstration helpers", () => {
  it("runs an ML-KEM-768 encapsulation and decapsulation round trip without exposing key material", () => {
    const outcome = runMlKemDemo();
    expect(outcome.sharedSecretMatches).toBe(true);
    expect(outcome.publicKeyBytes).toBe(1184);
    expect(outcome.ciphertextBytes).toBe(1088);
    expect(outcome.sharedSecretBytes).toBe(32);
  });

  it("runs an ML-DSA-65 signature check and identifies an altered message", () => {
    const outcome = runMlDsaDemo("ECDAT PQC demonstration message");
    expect(outcome.signatureValid).toBe(true);
    expect(outcome.tamperDetected).toBe(true);
    expect(outcome.publicKeyBytes).toBe(1952);
    expect(outcome.signatureBytes).toBe(3309);
  });
});
