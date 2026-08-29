import { describe, expect, it } from "vitest";
import { buildCbomPosture, cbomFindingFromSearch, filterCbomFindings, paginateCbomFindings, sortCbomFindings } from "./cbomInventory";
import type { InventoryFinding } from "@/lib/inventoryUtils";

const findings: InventoryFinding[] = [
  { findingKey: "alpha", assetName: "Alpha TLS", assetType: "Protocol", algorithm: "RSA-2048", cryptoRole: "Key exchange", library: "OpenSSL", version: "3", sourceLocation: "tls.conf", usageContext: "public api", dataState: "In transit", environment: "Production", sensitivity: "Confidential", criticality: "Critical", riskLevel: "Critical", classicalRisk: "High", quantumRisk: "Vulnerable", quantumVulnerable: true, hndlExposure: true, dataLifetimeYears: 10, migrationMonths: 12, confidence: 92, evidence: "evidence", provenance: "scanner" },
  { findingKey: "beta", assetName: "Beta checksum", assetType: "Source", algorithm: "SHA-1", cryptoRole: "Integrity", library: null, version: null, sourceLocation: "checksum.ts", usageContext: "archive", dataState: "At rest", environment: "Production", sensitivity: "Internal", criticality: "Medium", riskLevel: "Low", classicalRisk: "Medium", quantumRisk: "Medium", quantumVulnerable: false, hndlExposure: false, dataLifetimeYears: 2, migrationMonths: 4, confidence: 98, evidence: "evidence", provenance: "scanner" },
];

describe("rebuilt CBOM table utilities", () => {
  it("combines search, risk, and quantum filters without inventing records", () => {
    expect(filterCbomFindings(findings, { query: "openssl", risk: "Critical", quantum: "vulnerable" }).map(item => item.findingKey)).toEqual(["alpha"]);
    expect(filterCbomFindings(findings, { query: "missing", risk: "all", quantum: "all" })).toEqual([]);
  });
  it("sorts the selected table column in the selected direction", () => {
    expect(sortCbomFindings(findings, "confidence", "asc").map(item => item.findingKey)).toEqual(["alpha", "beta"]);
    expect(sortCbomFindings(findings, "risk", "desc").map(item => item.findingKey)).toEqual(["alpha", "beta"]);
  });
  it("clamps pagination and keeps the visible page bounded", () => {
    const result = paginateCbomFindings(findings, 99, 1);
    expect(result.totalPages).toBe(2);
    expect(result.currentPage).toBe(2);
    expect(result.rows.map(item => item.findingKey)).toEqual(["beta"]);
  });
  it("opens evidence only for an explicit finding deep link", () => {
    expect(cbomFindingFromSearch("?risk=Critical")).toBeNull();
    expect(cbomFindingFromSearch("?finding=alpha&risk=Critical")).toBe("alpha");
  });
  it("filters by observed HNDL, library, and confidence without adding synthetic assets", () => {
    expect(filterCbomFindings(findings, { query: "", risk: "all", quantum: "all", hndl: "qualified", library: "OpenSSL", minConfidence: "90" }).map(item => item.findingKey)).toEqual(["alpha"]);
    expect(filterCbomFindings(findings, { query: "", risk: "all", quantum: "all", hndl: "not-qualified", minConfidence: "99" })).toEqual([]);
  });
  it("summarizes only active observed findings and relationship node types for the CBOM posture strip", () => {
    expect(buildCbomPosture(findings, 83, [{ sourceNode: "service:Payments", targetNode: "library:OpenSSL" }, { sourceNode: "endpoint:Public", targetNode: "algorithm:RSA-2048" }])).toMatchObject({ totalAssets: 83, findings: 2, quantumVulnerable: 1, hndlExposed: 1, relatedServices: 2, relatedLibraries: 1 });
  });
});
