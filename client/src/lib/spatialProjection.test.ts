import { describe, expect, it } from "vitest";
import { getSeededScenario } from "../../../server/ecdatSeed";
import { buildBlastRadius, buildSpatialClusters, buildSpatialTimeline, highestRiskFinding, recommendationForFinding, searchSpatialEntities } from "./spatialProjection";

describe("ECDAT spatial projection", () => {
  const scenario = getSeededScenario("container-mesh");

  it("derives meaningful spatial clusters from observed scan findings", () => {
    const clusters = buildSpatialClusters(scenario.findings);

    expect(clusters.some(cluster => cluster.label === "Containerized production")).toBe(true);
    expect(clusters.some(cluster => cluster.label === "Critical systems")).toBe(true);
    expect(clusters.every(cluster => cluster.assetCount > 0 && cluster.findingKeys.length > 0)).toBe(true);
  });

  it("focuses blast radius on actual relationship evidence rather than fixed counts", () => {
    const finding = highestRiskFinding(scenario.findings);
    const radius = buildBlastRadius(finding!, scenario.relationships);

    expect(radius.nodes.length).toBeGreaterThan(1);
    expect(radius.edges.length).toBeGreaterThan(0);
    expect(radius.summary.algorithms).toBeGreaterThan(0);
  });

  it("keeps timeline and migration data tied to the selected finding", () => {
    const finding = scenario.findings.find(item => item.findingKey === "ctr-openssl")!;
    const timeline = buildSpatialTimeline(finding, 9, 2026);
    const recommendation = recommendationForFinding(finding.findingKey, scenario.recommendations);

    expect(timeline.migrationEndYear).toBe(2027);
    expect(timeline.dataEndYear).toBe(2041);
    expect(timeline.hndlExposed).toBe(finding.hndlExposure);
    expect(recommendation?.findingKey).toBe(finding.findingKey);
  });

  it("searches the current scan and its observed relationship labels", () => {
    const results = searchSpatialEntities("RSA-2048", scenario.findings, scenario.relationships);

    expect(results.some(result => result.kind === "finding")).toBe(true);
    expect(results.some(result => result.kind === "relationship")).toBe(true);
  });
});
