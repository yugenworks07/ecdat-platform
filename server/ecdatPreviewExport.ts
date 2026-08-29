import { buildCycloneDxOrientedCbom, buildExecutiveHtml } from "./ecdatExport";
import type { SeedScenario } from "./ecdatSeed";

export function buildSeededPreviewExport(scenario: SeedScenario, createdAt = new Date()) {
  return {
    source: "seeded-preview" as const,
    generatedAt: createdAt,
    cbom: buildCycloneDxOrientedCbom({
      scanKey: `preview_${scenario.id}`,
      displayName: scenario.displayName,
      createdAt,
      findings: scenario.findings,
    }),
    reportHtml: buildExecutiveHtml({
      displayName: scenario.displayName,
      criticalCount: scenario.criticalCount,
      quantumVulnerableCount: scenario.quantumVulnerableCount,
      hndlCount: scenario.hndlCount,
      quantumReadiness: scenario.quantumReadiness,
      findings: scenario.findings,
    }),
  };
}
