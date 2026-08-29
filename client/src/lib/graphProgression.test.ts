import { describe, expect, it } from "vitest";
import { graphScopeForMode, sourceEvidenceLeaves } from "./graphProgression";

const relationships = [
  { sourceNode: "endpoint:api", targetNode: "service:auth", relationship: "EXPOSES", evidence: "route", confidence: 93 },
  { sourceNode: "service:auth", targetNode: "library:pyjwt", relationship: "DEPENDS_ON", evidence: "manifest", confidence: 92 },
  { sourceNode: "library:pyjwt", targetNode: "algorithm:RSA-1024", relationship: "IMPLEMENTS", evidence: "source", confidence: 91 },
];

describe("progressive graph state", () => {
  it("keeps overview unfocused, explores the observed chain, and traces the bounded reverse impact lens", () => {
    expect(graphScopeForMode("overview", "algorithm:RSA-1024", relationships)).toEqual(new Set());
    expect(graphScopeForMode("explore", "service:auth", relationships)).toEqual(new Set(["algorithm:RSA-1024", "library:pyjwt", "service:auth", "endpoint:api"]));
    expect(graphScopeForMode("impact", "service:auth", relationships)).toEqual(new Set(["service:auth", "endpoint:api"]));
  });

  it("reveals only selected, observed source locations as progressive evidence leaves", () => {
    expect(sourceEvidenceLeaves(["rsa"], [
      { findingKey: "rsa", sourceLocation: "src/auth/signing.py:18" },
      { findingKey: "other", sourceLocation: "src/other.py:4" },
    ])).toEqual([{ id: "evidence:rsa", findingKey: "rsa", label: "auth/signing.py:18" }]);
  });
});
