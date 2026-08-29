import { describe, expect, it } from "vitest";
import { buildEvidenceChain, buildEvidenceReportHtml, buildReportEvidenceModel } from "./reportEvidence";

const finding = {
  findingKey: "rsa", assetName: "Payment TLS", assetType: "Certificate", algorithm: "RSA-2048", cryptoRole: "TLS", library: "OpenSSL", version: "1.1.1w", sourceLocation: "infra/nginx/tls.conf:18", usageContext: "Payment API", confidence: 92, evidence: "Public TLS certificate", provenance: "scanner", riskLevel: "Critical", quantumRisk: "Vulnerable", quantumVulnerable: true, hndlExposure: true, migrationMonths: 12,
};

describe("Evidence & Reports view model", () => {
  it("calculates coverage only from retained source evidence and prioritizes material risk", () => {
    const model = buildReportEvidenceModel({ displayName: "Payments", totalAssets: 2, criticalCount: 1, quantumVulnerableCount: 1, hndlCount: 1, quantumReadiness: 42, findings: [finding, { ...finding, findingKey: "sha", assetName: "Archive checksum", algorithm: "SHA-1", riskLevel: "Low", evidence: "", sourceLocation: "", confidence: 61, quantumVulnerable: false }], recommendations: [], relationships: [] });
    expect(model.coveragePercent).toBe(50);
    expect(model.lowConfidence).toBe(1);
    expect(model.primaryFinding?.findingKey).toBe("rsa");
  });

  it("labels the chain by evidence status without presenting the impact lens as runtime reachability", () => {
    const chain = buildEvidenceChain(finding, { findingKey: "rsa", title: "Adopt hybrid TLS", candidate: "Hybrid TLS", migrationNotes: "Validate clients", priority: 1 }, [{ sourceNode: "service:Payment API", targetNode: "algorithm:RSA-2048", relationship: "uses", evidence: "config", confidence: 90 }]);
    expect(chain.map(item => item.status)).toEqual(["Observed", "Observed", "Derived", "Derived", "Estimated", "Recommended"]);
    expect(chain.find(item => item.label === "Impact lens")?.detail).toContain("not runtime reachability");
  });

  it("builds a technical CBOM HTML artifact from the same evidence model used by the explorer", () => {
    const model = buildReportEvidenceModel({ displayName: "Payments", totalAssets: 1, criticalCount: 1, quantumVulnerableCount: 1, hndlCount: 1, quantumReadiness: 42, findings: [finding], recommendations: [], relationships: [] });
    const html = buildEvidenceReportHtml({ packageKey: "technical", generatedAt: new Date("2026-08-25T00:00:00Z"), model });
    expect(html).toContain("Technical CBOM");
    expect(html).toContain("Payment TLS");
    expect(html).toContain("infra/nginx/tls.conf:18");
  });

  it("scopes quantum packages to quantum or HNDL findings and escapes retained evidence fields", () => {
    const model = buildReportEvidenceModel({ displayName: "Payments", totalAssets: 2, criticalCount: 1, quantumVulnerableCount: 1, hndlCount: 1, quantumReadiness: 42, findings: [finding, { ...finding, findingKey: "sha", assetName: "<Archive checksum>", algorithm: "SHA-1", riskLevel: "Low", quantumVulnerable: false, hndlExposure: false }], recommendations: [], relationships: [] });
    const quantumHtml = buildEvidenceReportHtml({ packageKey: "quantum", generatedAt: new Date("2026-08-25T00:00:00Z"), model });
    const technicalHtml = buildEvidenceReportHtml({ packageKey: "technical", generatedAt: new Date("2026-08-25T00:00:00Z"), model });
    expect(quantumHtml).toContain("Payment TLS");
    expect(quantumHtml).not.toContain("Archive checksum");
    expect(technicalHtml).toContain("&lt;Archive checksum&gt;");
  });
});
