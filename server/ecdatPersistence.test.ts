import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { buildScenarioPersistenceRows, createScenarioRun } from "./ecdat";
import { getSeededScenario } from "./ecdatSeed";
import { ecdatFindings, ecdatScans } from "../drizzle/schema";

describe("ECDAT seeded scenario persistence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists a seeded run and its findings, recommendations, relationships, waves, and assumptions", async () => {
    const scenario = getSeededScenario("python-web");
    const createdAt = new Date("2026-08-24T00:00:00Z");
    const scan = { id: 1, scanKey: "scan_demo", userId: 7, displayName: scenario.displayName, repositoryUrl: "https://example.com/repo", scenario: scenario.id, status: "completed", totalAssets: scenario.totalAssets, criticalCount: scenario.criticalCount, quantumVulnerableCount: scenario.quantumVulnerableCount, hndlCount: scenario.hndlCount, quantumReadiness: scenario.quantumReadiness, createdAt, updatedAt: createdAt };
    const findings = scenario.findings.map((finding, index) => ({ ...finding, id: index + 1, scanKey: scan.scanKey, createdAt }));
    const recommendations = scenario.recommendations.map((recommendation, index) => ({ ...recommendation, id: index + 1, scanKey: scan.scanKey, status: "open", createdAt, updatedAt: createdAt }));
    const relationships = scenario.relationships.map((relationship, index) => ({ ...relationship, id: index + 1, scanKey: scan.scanKey, createdAt }));
    const waves = scenario.waves.map((wave, index) => ({ ...wave, id: index + 1, scanKey: scan.scanKey, createdAt }));
    const assumptions = [
      { id: 1, scanKey: scan.scanKey, assumptionKey: "data-lifetime", label: "Representative data lifetime", value: "15", unit: "years", source: "Seeded scenario context", confidence: 76, userConfirmed: false, createdAt, updatedAt: createdAt },
      { id: 2, scanKey: scan.scanKey, assumptionKey: "migration-time", label: "Representative migration time", value: "18", unit: "months", source: "Dependency-aware estimate", confidence: 68, userConfirmed: false, createdAt, updatedAt: createdAt },
      { id: 3, scanKey: scan.scanKey, assumptionKey: "crqc-horizon", label: "Planning horizon to CRQC", value: "9", unit: "years", source: "Configurable planning assumption", confidence: 52, userConfirmed: false, createdAt, updatedAt: createdAt },
    ];
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn(() => ({ values }));
    const select = vi.fn()
      .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: async () => [scan] }) }) })
      .mockReturnValueOnce({ from: () => ({ where: async () => findings }) })
      .mockReturnValueOnce({ from: () => ({ where: async () => assumptions }) })
      .mockReturnValueOnce({ from: () => ({ where: async () => recommendations }) })
      .mockReturnValueOnce({ from: () => ({ where: async () => relationships }) })
      .mockReturnValueOnce({ from: () => ({ where: async () => waves }) });
    const transaction = vi.fn(async (callback: (tx: { insert: typeof insert }) => Promise<unknown>) => callback({ insert }));
    vi.mocked(getDb).mockResolvedValue({ insert, select, transaction } as never);

    const result = await createScenarioRun(7, "python-web", "https://example.com/repo");

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(6);
    expect(values).toHaveBeenCalledTimes(6);
    expect(result.scan.displayName).toBe("Mercury Payments API");
    expect(result.findings).toHaveLength(scenario.findings.length);
    expect(result.assumptions).toHaveLength(3);
  });

  it("keeps repeated seeded finding keys distinct by scan key", () => {
    const scenario = getSeededScenario("java-enterprise");
    const firstRun = buildScenarioPersistenceRows(scenario, "scan_first");
    const secondRun = buildScenarioPersistenceRows(scenario, "scan_second");

    expect(firstRun.findings[0]?.findingKey).toBe(secondRun.findings[0]?.findingKey);
    expect(firstRun.findings[0]?.scanKey).toBe("scan_first");
    expect(secondRun.findings[0]?.scanKey).toBe("scan_second");
    expect(firstRun.findings[0]).not.toEqual(secondRun.findings[0]);
  });

  it("rolls back the scan row when a transactional findings insert fails", async () => {
    const insertFailure = new Error("duplicate finding key");
    const select = vi.fn();
    const committedScans: unknown[] = [];
    const committedFindings: unknown[] = [];
    const transaction = vi.fn(async (callback: (tx: { insert: (table: unknown) => { values: (payload: unknown) => Promise<void> } }) => Promise<unknown>) => {
      const pendingScans: unknown[] = [];
      const pendingFindings: unknown[] = [];
      const insert = (table: unknown) => ({
        values: async (payload: unknown) => {
          if (table === ecdatFindings) throw insertFailure;
          if (table === ecdatScans) pendingScans.push(payload);
          else pendingFindings.push(payload);
        },
      });

      try {
        await callback({ insert });
        committedScans.push(...pendingScans);
        committedFindings.push(...pendingFindings);
      } catch (error) {
        pendingScans.length = 0;
        pendingFindings.length = 0;
        throw error;
      }
    });
    vi.mocked(getDb).mockResolvedValue({ select, transaction } as never);

    await expect(createScenarioRun(7, "java-enterprise", "https://example.com/repo")).rejects.toThrow("duplicate finding key");

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(select).not.toHaveBeenCalled();
    expect(committedScans).toHaveLength(0);
    expect(committedFindings).toHaveLength(0);
  });
});
