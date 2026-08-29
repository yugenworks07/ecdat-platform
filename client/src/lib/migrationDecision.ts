import type { MigrationCandidate } from "./migrationInsights";

export type DecisionBand = "Monitor" | "Elevated" | "High" | "Critical";

const currentRiskWeight: Record<string, number> = { critical: 35, high: 28, medium: 18, low: 8 };
const criticalityWeight: Record<string, number> = { critical: 12, high: 8, medium: 4, low: 0 };

export function decisionBand(score: number): DecisionBand {
  if (score >= 81) return "Critical";
  if (score >= 61) return "High";
  if (score >= 31) return "Elevated";
  return "Monitor";
}

export function defaultQuantumScenarioYears(candidate: MigrationCandidate) {
  return Math.max(3, Math.min(20, Math.round(candidate.finding.dataLifetimeYears * 0.8)));
}

export function buildMigrationDecisionModel(candidate: MigrationCandidate, quantumScenarioYears: number) {
  const { finding, recommendation } = candidate;
  const migrationYears = finding.migrationMonths / 12;
  const protectionWindow = finding.dataLifetimeYears + migrationYears;
  const marginYears = protectionWindow - quantumScenarioYears;
  const timePressure = marginYears > 0 ? Math.min(25, Math.round(marginYears * 5)) : Math.max(-8, Math.round(marginYears * 2));
  const score = Math.max(0, Math.min(100, Math.round(
    (currentRiskWeight[finding.riskLevel.toLowerCase()] ?? 8)
    + (criticalityWeight[finding.criticality.toLowerCase()] ?? 0)
    + (finding.quantumVulnerable ? 16 : 0)
    + (finding.hndlExposure ? 12 : 0)
    + timePressure,
  )));
  const band = decisionBand(score);
  const currentYear = new Date().getFullYear();
  const migrationCompletionYear = currentYear + Math.ceil(migrationYears);
  const quantumScenarioYear = currentYear + quantumScenarioYears;
  const dataLifetimeEndYear = currentYear + finding.dataLifetimeYears;
  const action = score >= 81
    ? "Begin PQC migration planning within 12 months."
    : score >= 61
      ? "Schedule migration design and validation within 12 months."
      : score >= 31
        ? "Establish an owned migration plan and review this asset quarterly."
        : "Keep this asset in the monitored PQC backlog and validate changes on review.";

  return {
    score,
    band,
    action,
    quantumScenarioYears,
    migrationYears,
    protectionWindow,
    marginYears,
    currentYear,
    migrationCompletionYear,
    quantumScenarioYear,
    dataLifetimeEndYear,
    target: recommendation.candidate,
    why: [
      `${capitalize(finding.criticality)} criticality and ${finding.riskLevel.toLowerCase()} current risk raise this asset’s priority.`,
      `Observed data lifetime is ${finding.dataLifetimeYears} years; indicative migration time is ${finding.migrationMonths} months.`,
      `The interactive scenario places quantum capability at ${quantumScenarioYears} years from the current planning point.`,
      marginYears > 0
        ? `The protection window exceeds the scenario horizon by ${marginYears.toFixed(1)} years.`
        : `The scenario horizon is ${Math.abs(marginYears).toFixed(1)} years beyond the calculated protection window.`,
    ],
  };
}

function capitalize(value: string) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : "Unknown";
}
