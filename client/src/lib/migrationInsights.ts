import {
  buildBlastRadius,
  type SpatialFinding,
  type SpatialRecommendation,
  type SpatialRelationship,
  type SpatialWave,
} from "./spatialProjection";

export type PriorityBand = "P1" | "P2" | "P3" | "P4";

export type MigrationCandidate = {
  finding: SpatialFinding;
  recommendation: SpatialRecommendation;
  priorityBand: PriorityBand;
  urgency: number;
  effort: number;
  effortLabel: "Low" | "Moderate" | "High";
  blast: ReturnType<typeof buildBlastRadius>;
};

const riskWeight: Record<string, number> = { critical: 5, high: 4, medium: 2, low: 1 };
const criticalityWeight: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 };

export function priorityBand(priority: number): PriorityBand {
  if (priority <= 1) return "P1";
  if (priority <= 2) return "P2";
  if (priority <= 3) return "P3";
  return "P4";
}

export function effortWeeks(text: string) {
  const values = Array.from(text.matchAll(/\d+(?:\.\d+)?/g)).map(match => Number(match[0]));
  return values.length ? Math.max(...values) : 0;
}

export function effortScore(recommendation: Pick<SpatialRecommendation, "indicativeEffort">, relationshipBreadth = 0) {
  const weeks = effortWeeks(recommendation.indicativeEffort);
  const weeksScore = weeks >= 12 ? 5 : weeks >= 8 ? 4 : weeks >= 5 ? 3 : weeks >= 1 ? 2 : 1;
  const breadthScore = relationshipBreadth >= 12 ? 1 : relationshipBreadth >= 6 ? 0.5 : 0;
  return Math.min(5, Math.max(1, Math.round(weeksScore + breadthScore)));
}

export function effortLabel(score: number): MigrationCandidate["effortLabel"] {
  return score >= 4 ? "High" : score >= 3 ? "Moderate" : "Low";
}

export function urgencyScore(finding: Pick<SpatialFinding, "riskLevel" | "criticality" | "quantumVulnerable" | "hndlExposure" | "dataLifetimeYears" | "migrationMonths">) {
  const risk = riskWeight[finding.riskLevel.toLowerCase()] ?? 1;
  const criticality = criticalityWeight[finding.criticality.toLowerCase()] ?? 0;
  const dataLifetime = Math.min(3, Math.ceil(finding.dataLifetimeYears / 7));
  const migrationTime = Math.min(2, Math.ceil(finding.migrationMonths / 24));
  const raw = risk + criticality + (finding.quantumVulnerable ? 2 : 0) + (finding.hndlExposure ? 2 : 0) + dataLifetime - migrationTime;
  return Math.min(5, Math.max(1, Math.round(raw / 3)));
}

export function buildMigrationCandidates({
  findings,
  recommendations,
  relationships,
}: {
  findings: SpatialFinding[];
  recommendations: SpatialRecommendation[];
  relationships: SpatialRelationship[];
}): MigrationCandidate[] {
  const findingByKey = new Map(findings.map(finding => [finding.findingKey, finding]));
  return recommendations
    .flatMap(recommendation => {
      const finding = findingByKey.get(recommendation.findingKey);
      if (!finding) return [];
      const blast = buildBlastRadius(finding, relationships);
      const effort = effortScore(recommendation, blast.summary.evidenceNodes);
      return [{
        finding,
        recommendation,
        priorityBand: priorityBand(recommendation.priority),
        urgency: urgencyScore(finding),
        effort,
        effortLabel: effortLabel(effort),
        blast,
      }];
    })
    .sort((left, right) => right.urgency - left.urgency || left.effort - right.effort || left.recommendation.priority - right.recommendation.priority);
}

export function priorityCounts(candidates: MigrationCandidate[]) {
  return candidates.reduce((counts, candidate) => ({ ...counts, [candidate.priorityBand]: counts[candidate.priorityBand] + 1 }), { P1: 0, P2: 0, P3: 0, P4: 0 } as Record<PriorityBand, number>);
}

export function moscaDecision(finding: Pick<SpatialFinding, "dataLifetimeYears" | "migrationMonths">, crqcHorizonYears: number) {
  const windowYears = finding.dataLifetimeYears + finding.migrationMonths / 12;
  const margin = windowYears - crqcHorizonYears;
  return {
    windowYears,
    margin,
    status: margin > 0 ? "Planning condition present" : "Planning condition not indicated",
  } as const;
}

export function planningWaves(waves: SpatialWave[]) {
  return [
    {
      wave: 0,
      title: "Prepare",
      rationale: "Validate evidence, ownership, data classification, dependency mapping, and test scope before a production migration decision.",
      scope: "Planning construct; no production-completion claim.",
      indicativeEffort: "Planning scope",
      dependencies: "Evidence ownership and validation gate",
      isPlanningConstruct: true,
    },
    ...waves.map(wave => ({ ...wave, isPlanningConstruct: false })),
  ];
}
