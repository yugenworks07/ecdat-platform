import { describe, expect, it } from "vitest";
import { buildCycloneDxOrientedCbom } from "./ecdatExport";
import { buildBlastRadius, deriveRemediationWaves } from "./ecdatGraph";
import { buildSeededPreviewExport } from "./ecdatPreviewExport";
import { getSeededScenario } from "./ecdatSeed";
import { evaluateFindingRisk, scoreMoscaRisk, summarizeEvaluatedFindings } from "./ecdatRisk";

describe("ECDAT risk intelligence", () => {
  it("classifies long-lived sensitive data beyond the CRQC horizon as critical", () => {
    const result = scoreMoscaRisk(25, 18, 9);
    expect(result).toMatchObject({ level: "Critical", atRisk: true });
    expect(result.marginYears).toBeGreaterThan(8);
  });

  it("exposes evidence-backed findings in the Python demo scenario", () => {
    const scenario = getSeededScenario("python-web");
    expect(scenario.findings.length).toBeGreaterThan(0);
    expect(scenario.findings[0]).toMatchObject({
      algorithm: "RSA-2048",
      cryptoRole: "Key exchange",
    });
    expect(scenario.findings[0].evidence.length).toBeGreaterThan(10);
    expect(scenario.findings[0].provenance.length).toBeGreaterThan(10);
  });

  it("builds a CBOM-oriented export that retains finding provenance", () => {
    const scenario = getSeededScenario("container-mesh");
    const cbom = buildCycloneDxOrientedCbom({
      scanKey: "scan_test",
      displayName: scenario.displayName,
      createdAt: new Date("2026-08-24T00:00:00Z"),
      findings: scenario.findings,
    });
    expect(cbom.components).toHaveLength(scenario.findings.length);
    expect(cbom).toMatchObject({ bomFormat: "CycloneDX", specVersion: "1.6", version: 1 });
    expect(cbom.components[0]?.properties.some(property => property.name === "org.ecdat:provenance")).toBe(true);
  });

  it("builds no-database seeded preview exports with the same CBOM evidence shape", () => {
    const scenario = getSeededScenario("python-web");
    const payload = buildSeededPreviewExport(scenario, new Date("2026-08-24T00:00:00Z"));
    expect(payload.source).toBe("seeded-preview");
    expect(payload.cbom.serialNumber).toMatch(/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(payload.cbom.components).toHaveLength(scenario.findings.length);
    expect(payload.reportHtml).toContain(scenario.displayName);
  });

  it("applies user-configured Mosca inputs to HNDL assessment", () => {
    const result = evaluateFindingRisk({
      quantumVulnerable: true,
      sensitivity: "Confidential",
      fallbackDataLifetimeYears: 2,
      fallbackMigrationMonths: 2,
      dataLifetimeOverrideYears: 20,
      migrationOverrideMonths: 24,
      crqcHorizonYears: 9,
    });
    expect(result).toMatchObject({ level: "Critical", hndlExposure: true, dataLifetimeYears: 20 });
  });

  it("derives dependency-specific blast radius and remediation waves", () => {
    const scenario = getSeededScenario("container-mesh");
    const blastRadius = buildBlastRadius(scenario.relationships);
    const waves = deriveRemediationWaves(scenario.findings, scenario.relationships);
    expect(blastRadius.some(item => item.label.includes("OpenSSL"))).toBe(true);
    expect(waves[1]?.dependencySignal).toContain("evidence-backed path");
  });

  it("recalculates dashboard totals from evaluated risk outputs", () => {
    const metrics = summarizeEvaluatedFindings([
      { riskLevel: "Critical", hndlExposure: true, quantumVulnerable: true },
      { riskLevel: "High", hndlExposure: false, quantumVulnerable: true },
      { riskLevel: "Critical", hndlExposure: true, quantumVulnerable: false },
    ]);
    expect(metrics).toEqual({ criticalCount: 2, hndlCount: 2, quantumVulnerableCount: 2 });
  });

  it("changes recommendation choices and graph node types based on full finding context", () => {
    const scenario = getSeededScenario("compliance-heavy");
    const certificateRecommendation = scenario.recommendations.find(item => item.findingKey === "gov-rsa-cert");
    expect(certificateRecommendation?.candidate).toContain("Hybrid X.509 profile");
    expect(certificateRecommendation?.indicativeEffort).toContain("5–10");
    expect(scenario.relationships.some(edge => edge.sourceNode.startsWith("certificate-authority:"))).toBe(true);
    expect(scenario.relationships.some(edge => edge.relationship === "ISSUES")).toBe(true);
  });
});
