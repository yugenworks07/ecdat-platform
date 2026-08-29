export type SpatialFinding = {
  findingKey: string;
  assetName: string;
  algorithm: string;
  library: string | null;
  version: string | null;
  usageContext: string;
  sourceLocation: string;
  confidence: number;
  provenance: string;
  cryptoRole: string;
  dataState: string;
  environment: string;
  sensitivity: string;
  criticality: string;
  classicalRisk: string;
  quantumRisk: string;
  dataLifetimeYears: number;
  migrationMonths: number;
  quantumVulnerable: boolean;
  hndlExposure: boolean;
  riskLevel: string;
};

export type SpatialRelationship = {
  sourceNode: string;
  targetNode: string;
  relationship: string;
  evidence: string;
  confidence: number;
};

export type SpatialRecommendation = {
  findingKey: string;
  title: string;
  candidate: string;
  migrationNotes: string;
  compatibility: string;
  indicativeEffort: string;
  indicativeLatency: string;
  priority: number;
};

export type SpatialWave = {
  wave: number;
  title: string;
  rationale: string;
  scope: string;
  indicativeEffort: string;
  dependencies: string;
};

export type SpatialCluster = {
  id: string;
  label: string;
  dimension: "Environment" | "Exposure" | "Data state";
  findingKeys: string[];
  assetCount: number;
  criticalCount: number;
  vulnerableCount: number;
  riskWeight: number;
};

export type SpatialGraphNode = {
  id: string;
  label: string;
  kind: string;
  riskWeight: number;
  findingKeys: string[];
};

export type SpatialSearchResult = {
  id: string;
  kind: "finding" | "relationship";
  label: string;
  subtitle: string;
};

export type SpatialTimeline = {
  startYear: number;
  crqcEstimateYear: number;
  migrationEndYear: number;
  dataEndYear: number;
  hndlExposed: boolean;
};

export function cleanSpatialLabel(value: string) {
  return value.replace(/^[^:]+:/, "");
}

export function spatialNodeKind(value: string) {
  return value.split(":")[0] || "entity";
}

export function riskWeight(finding: Pick<SpatialFinding, "riskLevel" | "criticality" | "quantumVulnerable" | "hndlExposure">) {
  const risk = { critical: 5, high: 4, medium: 2, low: 1 }[finding.riskLevel.toLowerCase()] ?? 1;
  const criticality = { critical: 2, high: 1 }[finding.criticality.toLowerCase()] ?? 0;
  return risk + criticality + (finding.quantumVulnerable ? 1 : 0) + (finding.hndlExposure ? 1 : 0);
}

function cluster(id: string, label: string, dimension: SpatialCluster["dimension"], members: SpatialFinding[]): SpatialCluster {
  return {
    id,
    label,
    dimension,
    findingKeys: members.map(finding => finding.findingKey),
    assetCount: members.length,
    criticalCount: members.filter(finding => ["critical", "high"].includes(finding.criticality.toLowerCase())).length,
    vulnerableCount: members.filter(finding => finding.quantumVulnerable).length,
    riskWeight: Math.max(1, ...members.map(riskWeight)),
  };
}

export function buildSpatialClusters(findings: SpatialFinding[]): SpatialCluster[] {
  const environments = Array.from(new Set(findings.map(finding => finding.environment))).map(environment =>
    cluster(`environment:${environment}`, environment, "Environment", findings.filter(finding => finding.environment === environment))
  );
  const critical = findings.filter(finding => ["critical", "high"].includes(finding.criticality.toLowerCase()));
  const exposed = findings.filter(finding => finding.dataState === "In transit");
  const clusters = [
    ...environments,
    ...(critical.length ? [cluster("exposure:critical", "Critical systems", "Exposure", critical)] : []),
    ...(exposed.length ? [cluster("data-state:transit", "External-facing paths", "Data state", exposed)] : []),
  ];
  return clusters.sort((a, b) => b.riskWeight - a.riskWeight || b.assetCount - a.assetCount);
}

function findingKeysForNode(node: string, findings: SpatialFinding[]) {
  const label = cleanSpatialLabel(node).toLowerCase();
  return findings
    .filter(finding => [finding.assetName, finding.algorithm, finding.library ?? ""].some(value => value.toLowerCase() === label || label.includes(value.toLowerCase())))
    .map(finding => finding.findingKey);
}

export function buildSpatialGraph(relationships: SpatialRelationship[], findings: SpatialFinding[]): SpatialGraphNode[] {
  const nodes = Array.from(new Set(relationships.flatMap(edge => [edge.sourceNode, edge.targetNode])));
  return nodes.map(node => {
    const findingKeys = findingKeysForNode(node, findings);
    const matches = findings.filter(finding => findingKeys.includes(finding.findingKey));
    return {
      id: node,
      label: cleanSpatialLabel(node),
      kind: spatialNodeKind(node),
      findingKeys,
      riskWeight: matches.length ? Math.max(...matches.map(riskWeight)) : 1,
    };
  });
}

export function highestRiskFinding(findings: SpatialFinding[]) {
  return [...findings].sort((a, b) => riskWeight(b) - riskWeight(a) || b.confidence - a.confidence)[0];
}

function rootNodesForFinding(finding: SpatialFinding, relationships: SpatialRelationship[]) {
  const candidateLabels = [finding.assetName, finding.algorithm, finding.library ?? ""].filter(Boolean).map(value => value.toLowerCase());
  const nodes = Array.from(new Set(relationships.flatMap(edge => [edge.sourceNode, edge.targetNode])));
  return nodes.filter(node => {
    const label = cleanSpatialLabel(node).toLowerCase();
    return candidateLabels.some(candidate => label === candidate || label.includes(candidate));
  });
}

export function buildBlastRadius(finding: SpatialFinding, relationships: SpatialRelationship[]) {
  const included = new Set(rootNodesForFinding(finding, relationships));
  for (let depth = 0; depth < 2; depth += 1) {
    relationships.forEach(edge => {
      if (included.has(edge.sourceNode) || included.has(edge.targetNode)) {
        included.add(edge.sourceNode);
        included.add(edge.targetNode);
      }
    });
  }
  const edges = relationships.filter(edge => included.has(edge.sourceNode) && included.has(edge.targetNode));
  const nodes = Array.from(included);
  const count = (kinds: string[]) => nodes.filter(node => kinds.includes(spatialNodeKind(node))).length;
  return {
    nodes,
    edges,
    summary: {
      evidenceNodes: nodes.length,
      servicesAndEndpoints: count(["service", "endpoint"]),
      cryptoAssets: count(["asset", "certificate", "certificate-authority"]),
      algorithms: count(["algorithm"]),
      libraries: count(["library"]),
      protectedData: count(["data"]),
    },
  };
}

export function buildSpatialTimeline(finding: SpatialFinding, crqcHorizonYears = 9, startYear = new Date().getFullYear()): SpatialTimeline {
  return {
    startYear,
    crqcEstimateYear: startYear + crqcHorizonYears,
    migrationEndYear: startYear + Math.ceil(finding.migrationMonths / 12),
    dataEndYear: startYear + finding.dataLifetimeYears,
    hndlExposed: finding.hndlExposure,
  };
}

export function recommendationForFinding(findingKey: string | undefined, recommendations: SpatialRecommendation[]) {
  return recommendations.find(recommendation => recommendation.findingKey === findingKey);
}

export function relatedWaves(finding: SpatialFinding | undefined, waves: SpatialWave[]) {
  if (!finding) return [];
  const role = finding.cryptoRole.toLowerCase();
  return waves.filter(wave =>
    wave.wave === 1 ||
    (wave.wave === 2 && Boolean(finding.library)) ||
    (wave.wave === 3 && (finding.quantumVulnerable || role.includes("key") || role.includes("signature")))
  );
}

export function searchSpatialEntities(query: string, findings: SpatialFinding[], relationships: SpatialRelationship[]): SpatialSearchResult[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];
  const findingResults = findings
    .filter(finding => [finding.assetName, finding.algorithm, finding.library ?? "", finding.sourceLocation].some(value => value.toLowerCase().includes(term)))
    .map(finding => ({ id: finding.findingKey, kind: "finding" as const, label: finding.assetName, subtitle: `${finding.algorithm} · ${finding.riskLevel} risk` }));
  const relationshipResults = Array.from(new Set(relationships.flatMap(edge => [edge.sourceNode, edge.targetNode])))
    .filter(node => cleanSpatialLabel(node).toLowerCase().includes(term))
    .map(node => ({ id: node, kind: "relationship" as const, label: cleanSpatialLabel(node), subtitle: `${spatialNodeKind(node)} relationship entity` }));
  return [...findingResults, ...relationshipResults].slice(0, 8);
}
