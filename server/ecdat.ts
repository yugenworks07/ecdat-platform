import { and, desc, eq } from "drizzle-orm";
import {
  ecdatAssumptions,
  ecdatFindings,
  ecdatMigrationWaves,
  ecdatRecommendations,
  ecdatRelationships,
  ecdatScans,
} from "../drizzle/schema";
import { getDb } from "./db";
import { buildCycloneDxOrientedCbom, buildExecutiveHtml } from "./ecdatExport";
import { buildBlastRadius, deriveRemediationWaves } from "./ecdatGraph";
import { evaluateFindingRisk, summarizeEvaluatedFindings } from "./ecdatRisk";
import { getSeededScenario, recommendationsFor, relationshipsFor, type ScenarioId, type SeedFinding, type SeedScenario, type SeedWave } from "./ecdatSeed";
import { nanoid } from "nanoid";
import { scanPublicGitHubRepository, type RepositoryScanResult } from "./scanners/repositoryScanner";
import { classifyRepositoryOutcome, coverageLabel } from "../shared/repositoryOutcome";

function requiredDb() {
  return getDb().then(db => {
    if (!db) throw new Error("ECDAT persistence is unavailable.");
    return db;
  });
}

export function buildScenarioPersistenceRows(scenario: SeedScenario, scanKey: string) {
  return {
    findings: scenario.findings.map(finding => ({ ...finding, scanKey })),
    recommendations: scenario.recommendations.map(recommendation => ({ ...recommendation, scanKey, status: "open" as const })),
    relationships: scenario.relationships.map(relationship => ({ ...relationship, scanKey })),
    waves: scenario.waves.map(wave => ({ ...wave, scanKey })),
    assumptions: [
      { scanKey, assumptionKey: "data-lifetime", label: "Representative data lifetime", value: "15", unit: "years", source: "Seeded scenario context", confidence: 76, userConfirmed: false },
      { scanKey, assumptionKey: "migration-time", label: "Representative migration time", value: "18", unit: "months", source: "Dependency-aware estimate", confidence: 68, userConfirmed: false },
      { scanKey, assumptionKey: "crqc-horizon", label: "Planning horizon to CRQC", value: "9", unit: "years", source: "Configurable planning assumption", confidence: 52, userConfirmed: false },
    ],
  };
}

export async function createScenarioRun(userId: number, scenarioId: ScenarioId, repositoryUrl?: string) {
  const db = await requiredDb();
  const scenario = getSeededScenario(scenarioId);
  const scanKey = `scan_${nanoid(10)}`;
  const rows = buildScenarioPersistenceRows(scenario, scanKey);

  await db.transaction(async tx => {
    await tx.insert(ecdatScans).values({
      scanKey,
      userId,
      displayName: scenario.displayName,
      repositoryUrl: repositoryUrl?.trim() || scenario.repositoryPlaceholder,
      scenario: scenario.id,
      status: "completed",
      totalAssets: scenario.totalAssets,
      criticalCount: scenario.criticalCount,
      quantumVulnerableCount: scenario.quantumVulnerableCount,
      hndlCount: scenario.hndlCount,
      quantumReadiness: scenario.quantumReadiness,
    });

    await tx.insert(ecdatFindings).values(rows.findings);
    await tx.insert(ecdatRecommendations).values(rows.recommendations);
    await tx.insert(ecdatRelationships).values(rows.relationships);
    await tx.insert(ecdatMigrationWaves).values(rows.waves);
    await tx.insert(ecdatAssumptions).values(rows.assumptions);
  });

  return getScanDetail(userId, scanKey);
}

function buildRepositoryWaves(findings: SeedFinding[]): SeedWave[] {
  const quantumFindings = findings.filter(finding => finding.quantumVulnerable);
  const classicalFindings = findings.filter(finding => finding.classicalRisk === "High");
  if (!quantumFindings.length && !classicalFindings.length) return [];
  return [
    {
      wave: 1,
      title: "Validate static-analysis findings",
      rationale: `${findings.length} source-file finding${findings.length === 1 ? "" : "s"} were identified by bounded static analysis and require owner validation before change planning.`,
      scope: findings.map(finding => finding.sourceLocation).join("; "),
      indicativeEffort: "Indicative: 1–3 engineering days",
      dependencies: "Confirm runtime paths, key sizes, data classification, and deployed-library versions before remediation.",
    },
    ...(quantumFindings.length ? [{
      wave: 2,
      title: "Modernize discovered public-key usage",
      rationale: `${quantumFindings.length} static finding${quantumFindings.length === 1 ? "" : "s"} use public-key cryptography that merits migration assessment under current planning inputs.`,
      scope: quantumFindings.map(finding => finding.sourceLocation).join("; ") || "No quantum-vulnerable static pattern was found.",
      indicativeEffort: "Indicative: 2–6 engineer-weeks",
      dependencies: "Validate protocol, peer, certificate, and library compatibility before rollout.",
    }] : [{
      wave: 2,
      title: "Address discovered classical cryptographic weakness",
      rationale: `${classicalFindings.length} static finding${classicalFindings.length === 1 ? "" : "s"} merit corrective assessment based on observed classical-risk indicators.`,
      scope: classicalFindings.map(finding => finding.sourceLocation).join("; "),
      indicativeEffort: "Indicative: 1–3 engineering days",
      dependencies: "Validate the observed use and runtime configuration before any corrective change.",
    }]),
  ];
}

function repositoryReadiness(findings: SeedFinding[]) {
  const quantumCount = findings.filter(finding => finding.quantumVulnerable).length;
  const highClassicalCount = findings.filter(finding => finding.classicalRisk === "High").length;
  return Math.max(0, Math.min(100, 100 - quantumCount * 17 - highClassicalCount * 9));
}

export async function createRepositoryStaticScan(
  userId: number,
  repositoryUrl: string,
  scanner: (url: string) => Promise<RepositoryScanResult> = scanPublicGitHubRepository
) {
  const analysis = await scanner(repositoryUrl);
  const db = await requiredDb();
  const scanKey = `scan_${nanoid(10)}`;
  const displayName = `${analysis.repository.owner}/${analysis.repository.repository}`;
  const contextSignals = analysis.contextSignals ?? [];
  const outcome = classifyRepositoryOutcome({ findings: analysis.findings, contextSignals });
  const recommendations = recommendationsFor(analysis.findings);
  const relationships = relationshipsFor(displayName, "repository-static", analysis.findings);
  const waves = outcome.kind === "risk-identified" ? buildRepositoryWaves(analysis.findings) : [];
  const metrics = summarizeEvaluatedFindings(analysis.findings);

  await db.transaction(async tx => {
    await tx.insert(ecdatScans).values({
      scanKey,
      userId,
      displayName,
      repositoryUrl: analysis.repository.canonicalUrl,
      scenario: "repository-static",
      status: "completed",
      totalAssets: new Set(analysis.findings.map(finding => finding.assetName)).size,
      criticalCount: metrics.criticalCount,
      quantumVulnerableCount: metrics.quantumVulnerableCount,
      hndlCount: metrics.hndlCount,
      quantumReadiness: outcome.readinessApplicable ? repositoryReadiness(analysis.findings) : 0,
    });
    if (analysis.findings.length) await tx.insert(ecdatFindings).values(analysis.findings.map(finding => ({ ...finding, scanKey })));
    if (recommendations.length) await tx.insert(ecdatRecommendations).values(recommendations.map(recommendation => ({ ...recommendation, scanKey, status: "open" as const })));
    if (relationships.length) await tx.insert(ecdatRelationships).values(relationships.map(relationship => ({ ...relationship, scanKey })));
    if (waves.length) await tx.insert(ecdatMigrationWaves).values(waves.map(wave => ({ ...wave, scanKey })));
    await tx.insert(ecdatAssumptions).values([
      { scanKey, assumptionKey: "data-lifetime", label: "Representative data lifetime", value: "0", unit: "years", source: "Not inferred by static analysis", confidence: 0, userConfirmed: false },
      { scanKey, assumptionKey: "migration-time", label: "Representative migration time", value: "0", unit: "months", source: "Not inferred by static analysis", confidence: 0, userConfirmed: false },
      { scanKey, assumptionKey: "crqc-horizon", label: "Planning horizon to CRQC", value: "9", unit: "years", source: "Default planning assumption", confidence: 52, userConfirmed: false },
      { scanKey, assumptionKey: "repository-outcome", label: "Repository outcome", value: outcome.kind, unit: "classification", source: "Bounded static-analysis evidence", confidence: 100, userConfirmed: false },
      { scanKey, assumptionKey: "repository-coverage", label: "Discovery coverage", value: analysis.coverageIncomplete ? "incomplete" : "bounded", unit: "status", source: coverageLabel(Boolean(analysis.coverageIncomplete)), confidence: analysis.coverageIncomplete ? 70 : 100, userConfirmed: false },
      ...contextSignals.map(signal => ({ scanKey, assumptionKey: `context-signal-${signal.id}`, label: signal.label, value: "observed", unit: "signal", source: "Bounded static-analysis context indicator", confidence: 70, userConfirmed: false })),
    ]);
  });
  return getScanDetail(userId, scanKey);
}

export async function listUserScans(userId: number) {
  const db = await requiredDb();
  return db.select().from(ecdatScans).where(eq(ecdatScans.userId, userId)).orderBy(desc(ecdatScans.createdAt));
}

export async function getScanDetail(userId: number, scanKey: string) {
  const db = await requiredDb();
  const scans = await db
    .select()
    .from(ecdatScans)
    .where(and(eq(ecdatScans.userId, userId), eq(ecdatScans.scanKey, scanKey)))
    .limit(1);
  const scan = scans[0];
  if (!scan) throw new Error("ECDAT scan not found.");

  const [findings, assumptions, recommendations, relationships, waves] = await Promise.all([
    db.select().from(ecdatFindings).where(eq(ecdatFindings.scanKey, scanKey)),
    db.select().from(ecdatAssumptions).where(eq(ecdatAssumptions.scanKey, scanKey)),
    db.select().from(ecdatRecommendations).where(eq(ecdatRecommendations.scanKey, scanKey)),
    db.select().from(ecdatRelationships).where(eq(ecdatRelationships.scanKey, scanKey)),
    db.select().from(ecdatMigrationWaves).where(eq(ecdatMigrationWaves.scanKey, scanKey)),
  ]);

  const assumptionMap = new Map(assumptions.map(assumption => [assumption.assumptionKey, assumption]));
  const lifetimeAssumption = assumptionMap.get("data-lifetime");
  const migrationAssumption = assumptionMap.get("migration-time");
  const horizonAssumption = assumptionMap.get("crqc-horizon");
  const userConfigured = Boolean(
    lifetimeAssumption?.userConfirmed && migrationAssumption?.userConfirmed && horizonAssumption?.userConfirmed
  );
  const crqcHorizonYears = Number(horizonAssumption?.value ?? 9);
  const evaluatedFindings = findings.map(finding => {
    const assessment = evaluateFindingRisk({
      quantumVulnerable: finding.quantumVulnerable,
      sensitivity: finding.sensitivity,
      fallbackDataLifetimeYears: finding.dataLifetimeYears,
      fallbackMigrationMonths: finding.migrationMonths,
      crqcHorizonYears,
      dataLifetimeOverrideYears: userConfigured ? Number(lifetimeAssumption?.value) : undefined,
      migrationOverrideMonths: userConfigured ? Number(migrationAssumption?.value) : undefined,
    });
    return { ...finding, riskLevel: assessment.level, hndlExposure: assessment.hndlExposure, assessment };
  });
  const blastRadius = buildBlastRadius(relationships);
  const derivedWaves = deriveRemediationWaves(evaluatedFindings, relationships);
  const evaluatedMetrics = summarizeEvaluatedFindings(evaluatedFindings);

  return { scan: { ...scan, ...evaluatedMetrics }, findings: evaluatedFindings, assumptions, recommendations, relationships, waves, blastRadius, derivedWaves, userConfigured };
}

export async function saveMoscaAssumptions(
  userId: number,
  input: { scanKey: string; dataLifetimeYears: number; migrationMonths: number; crqcHorizonYears: number }
) {
  const db = await requiredDb();
  await getScanDetail(userId, input.scanKey);
  await db.delete(ecdatAssumptions).where(eq(ecdatAssumptions.scanKey, input.scanKey));
  await db.insert(ecdatAssumptions).values([
    { scanKey: input.scanKey, assumptionKey: "data-lifetime", label: "Representative data lifetime", value: String(input.dataLifetimeYears), unit: "years", source: "User-configured planning input", confidence: 100, userConfirmed: true },
    { scanKey: input.scanKey, assumptionKey: "migration-time", label: "Representative migration time", value: String(input.migrationMonths), unit: "months", source: "User-configured planning input", confidence: 100, userConfirmed: true },
    { scanKey: input.scanKey, assumptionKey: "crqc-horizon", label: "Planning horizon to CRQC", value: String(input.crqcHorizonYears), unit: "years", source: "User-configured planning input", confidence: 100, userConfirmed: true },
  ]);
  return getScanDetail(userId, input.scanKey);
}

export async function getExportPayload(userId: number, scanKey: string) {
  const detail = await getScanDetail(userId, scanKey);
  return {
    cbom: buildCycloneDxOrientedCbom({
      scanKey,
      displayName: detail.scan.displayName,
      createdAt: detail.scan.createdAt,
      findings: detail.findings,
    }),
    reportHtml: buildExecutiveHtml({
      displayName: detail.scan.displayName,
      criticalCount: detail.scan.criticalCount,
      quantumVulnerableCount: detail.scan.quantumVulnerableCount,
      hndlCount: detail.scan.hndlCount,
      quantumReadiness: detail.scan.quantumReadiness,
      findings: detail.findings,
    }),
  };
}
