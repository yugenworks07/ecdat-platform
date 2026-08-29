import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: vi.fn() }));

import { getDb } from "./db";
import { createRepositoryStaticScan } from "./ecdat";
import { analyzeRepositoryFiles, parsePublicGitHubRepository } from "./scanners/repositoryScanner";
import { ecdatFindings, ecdatScans } from "../drizzle/schema";

describe("ECDAT static repository scan persistence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists bounded static findings as a truthful repository-static scan", async () => {
    const repository = parsePublicGitHubRepository("https://github.com/example/crypto-service");
    const findings = analyzeRepositoryFiles(repository, "main", [{ path: "src/server.ts", content: "const signature = createSign('rsa-sha256');" }]);
    const createdAt = new Date("2026-08-26T00:00:00Z");
    const scan = { id: 1, scanKey: "scan_repo", userId: 7, displayName: "example/crypto-service", repositoryUrl: repository.canonicalUrl, scenario: "repository-static" as const, status: "completed" as const, totalAssets: 1, criticalCount: 0, quantumVulnerableCount: 1, hndlCount: 0, quantumReadiness: 83, createdAt, updatedAt: createdAt };
    const persistedFindings = findings.map((finding, index) => ({ ...finding, id: index + 1, scanKey: scan.scanKey, createdAt }));
    const assumptions = [
      { id: 1, scanKey: scan.scanKey, assumptionKey: "data-lifetime", label: "Representative data lifetime", value: "0", unit: "years", source: "Not inferred by static analysis", confidence: 0, userConfirmed: false, createdAt, updatedAt: createdAt },
      { id: 2, scanKey: scan.scanKey, assumptionKey: "migration-time", label: "Representative migration time", value: "0", unit: "months", source: "Not inferred by static analysis", confidence: 0, userConfirmed: false, createdAt, updatedAt: createdAt },
      { id: 3, scanKey: scan.scanKey, assumptionKey: "crqc-horizon", label: "Planning horizon to CRQC", value: "9", unit: "years", source: "Default planning assumption", confidence: 52, userConfirmed: false, createdAt, updatedAt: createdAt },
    ];
    const recommendations = [{ id: 1, scanKey: scan.scanKey, findingKey: findings[0]!.findingKey, recommendationType: "Hybrid signature", title: "Plan a signature migration", candidate: "ECDSA + ML-DSA-65", migrationNotes: "Static finding", compatibility: "Validate", indicativeEffort: "Indicative", indicativeLatency: "Indicative", priority: 7, status: "open" as const, createdAt, updatedAt: createdAt }];
    const relationships = [{ id: 1, scanKey: scan.scanKey, sourceNode: "service:example/crypto-service", targetNode: "asset:src/server.ts", relationship: "USES", evidence: "Static", confidence: 76, createdAt }];
    const waves = [{ id: 1, scanKey: scan.scanKey, wave: 1, title: "Validate static-analysis findings", rationale: "Static", scope: "src/server.ts", indicativeEffort: "Indicative", dependencies: "Validate", createdAt }];
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn(() => ({ values }));
    const select = vi.fn()
      .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: async () => [scan] }) }) })
      .mockReturnValueOnce({ from: () => ({ where: async () => persistedFindings }) })
      .mockReturnValueOnce({ from: () => ({ where: async () => assumptions }) })
      .mockReturnValueOnce({ from: () => ({ where: async () => recommendations }) })
      .mockReturnValueOnce({ from: () => ({ where: async () => relationships }) })
      .mockReturnValueOnce({ from: () => ({ where: async () => waves }) });
    const transaction = vi.fn(async (callback: (tx: { insert: typeof insert }) => Promise<unknown>) => callback({ insert }));
    vi.mocked(getDb).mockResolvedValue({ insert, select, transaction } as never);

    const result = await createRepositoryStaticScan(7, repository.canonicalUrl, async () => ({ repository, branch: "main", findings, scannedFileCount: 1, skippedFileCount: 0 }));

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(6);
    expect(values.mock.calls[0]?.[0]).toMatchObject({ scenario: "repository-static", repositoryUrl: repository.canonicalUrl });
    expect(values.mock.calls.find(call => call[0] === ecdatFindings)).toBeUndefined();
    expect(result.scan.scenario).toBe("repository-static");
    expect(result.findings[0]?.evidence).toContain("not executed");
  });

  it("treats manifest-only wrapper evidence as a persistable repository-static finding", async () => {
    const repository = parsePublicGitHubRepository("https://github.com/example/wrapped-security");
    const findings = analyzeRepositoryFiles(repository, "main", [{ path: "requirements.txt", content: "passlib==1.7.4\nPyJWT==2.8.0" }]);
    expect(findings).toHaveLength(2);
    expect(findings.every(finding => finding.assetType === "Dependency manifest")).toBe(true);
    expect(findings.every(finding => finding.evidence.includes("not executed"))).toBe(true);
  });

  it("persists a zero-finding context-review outcome without artificial remediation records", async () => {
    const repository = parsePublicGitHubRepository("https://github.com/example/context-only-service");
    const createdAt = new Date("2026-08-27T00:00:00Z");
    const scan = { id: 2, scanKey: "scan_context", userId: 7, displayName: "example/context-only-service", repositoryUrl: repository.canonicalUrl, scenario: "repository-static" as const, status: "completed" as const, totalAssets: 0, criticalCount: 0, quantumVulnerableCount: 0, hndlCount: 0, quantumReadiness: 0, createdAt, updatedAt: createdAt };
    const assumptions = [
      { id: 1, scanKey: scan.scanKey, assumptionKey: "repository-outcome", label: "Repository outcome", value: "context-review", unit: "classification", source: "Bounded static-analysis evidence", confidence: 100, userConfirmed: false, createdAt, updatedAt: createdAt },
      { id: 2, scanKey: scan.scanKey, assumptionKey: "context-signal-authentication", label: "Authentication or session handling referenced", value: "observed", unit: "signal", source: "Bounded static-analysis context indicator", confidence: 70, userConfirmed: false, createdAt, updatedAt: createdAt },
    ];
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn(() => ({ values }));
    const select = vi.fn()
      .mockReturnValueOnce({ from: () => ({ where: () => ({ limit: async () => [scan] }) }) })
      .mockReturnValueOnce({ from: () => ({ where: async () => [] }) })
      .mockReturnValueOnce({ from: () => ({ where: async () => assumptions }) })
      .mockReturnValueOnce({ from: () => ({ where: async () => [] }) })
      .mockReturnValueOnce({ from: () => ({ where: async () => [] }) })
      .mockReturnValueOnce({ from: () => ({ where: async () => [] }) });
    const transaction = vi.fn(async (callback: (tx: { insert: typeof insert }) => Promise<unknown>) => callback({ insert }));
    vi.mocked(getDb).mockResolvedValue({ insert, select, transaction } as never);

    const result = await createRepositoryStaticScan(7, repository.canonicalUrl, async () => ({ repository, branch: "main", findings: [], scannedFileCount: 1, skippedFileCount: 0, contextSignals: [{ id: "authentication", label: "Authentication or session handling referenced" }] }));

    expect(values.mock.calls[0]?.[0]).toMatchObject({ totalAssets: 0, quantumReadiness: 0 });
    expect(values.mock.calls[1]?.[0]).toEqual(expect.arrayContaining([expect.objectContaining({ assumptionKey: "repository-outcome", value: "context-review" })]));
    expect(insert.mock.calls).toHaveLength(2);
    expect(result.findings).toEqual([]);
    expect(result.waves).toEqual([]);
  });
});
