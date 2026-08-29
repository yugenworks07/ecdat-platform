export type RiskLevel = "Critical" | "High" | "Medium" | "Low";

export function scoreMoscaRisk(
  dataLifetimeYears: number,
  migrationMonths: number,
  crqcHorizonYears: number
) {
  const migrationYears = migrationMonths / 12;
  const marginYears = Number((dataLifetimeYears + migrationYears - crqcHorizonYears).toFixed(1));

  const level: RiskLevel =
    marginYears >= 8 ? "Critical" : marginYears >= 3 ? "High" : marginYears >= 0 ? "Medium" : "Low";

  return {
    level,
    marginYears,
    migrationYears: Number(migrationYears.toFixed(1)),
    atRisk: marginYears >= 0,
  };
}

export function isPotentialHndlExposure(input: {
  quantumVulnerable: boolean;
  sensitivity: string;
  dataLifetimeYears: number;
  crqcHorizonYears: number;
}) {
  return (
    input.quantumVulnerable &&
    ["Confidential", "Secret", "Top secret"].includes(input.sensitivity) &&
    input.dataLifetimeYears >= input.crqcHorizonYears
  );
}

export function evaluateFindingRisk(input: {
  quantumVulnerable: boolean;
  sensitivity: string;
  fallbackDataLifetimeYears: number;
  fallbackMigrationMonths: number;
  crqcHorizonYears: number;
  dataLifetimeOverrideYears?: number;
  migrationOverrideMonths?: number;
}) {
  const dataLifetimeYears = input.dataLifetimeOverrideYears ?? input.fallbackDataLifetimeYears;
  const migrationMonths = input.migrationOverrideMonths ?? input.fallbackMigrationMonths;
  const mosca = scoreMoscaRisk(dataLifetimeYears, migrationMonths, input.crqcHorizonYears);
  return {
    ...mosca,
    dataLifetimeYears,
    migrationMonths,
    hndlExposure: isPotentialHndlExposure({
      quantumVulnerable: input.quantumVulnerable,
      sensitivity: input.sensitivity,
      dataLifetimeYears,
      crqcHorizonYears: input.crqcHorizonYears,
    }),
  };
}

export function summarizeEvaluatedFindings(findings: Array<{ riskLevel: string; hndlExposure: boolean; quantumVulnerable: boolean }>) {
  return {
    criticalCount: findings.filter(finding => finding.riskLevel === "Critical").length,
    hndlCount: findings.filter(finding => finding.hndlExposure).length,
    quantumVulnerableCount: findings.filter(finding => finding.quantumVulnerable).length,
  };
}
