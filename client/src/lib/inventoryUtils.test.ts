import { describe, expect, it } from "vitest";
import { buildInventorySummary, buildSingleAssetCbom, buildSingleAssetHtmlReport, filterInventoryFindings, inventoryFindingFromSearch, nextInventorySort, sortInventoryFindings, type InventoryFinding } from "./inventoryUtils";

const findings: InventoryFinding[] = [
  { findingKey: "rsa", assetName: "Payment TLS", assetType: "Protocol configuration", algorithm: "RSA-2048", cryptoRole: "Key exchange", library: "OpenSSL", version: "3", sourceLocation: "gateway/tls.ts", usageContext: "Payment API", dataState: "In transit", environment: "Production", sensitivity: "Secret", criticality: "Critical", riskLevel: "Critical", classicalRisk: "Medium", quantumRisk: "High", quantumVulnerable: true, hndlExposure: true, dataLifetimeYears: 12, migrationMonths: 6, confidence: 94, evidence: "scanner", provenance: "AST" },
  { findingKey: "aes", assetName: "Ledger envelope", assetType: "Source code", algorithm: "AES-256-GCM", cryptoRole: "Encryption", library: "JCE", version: "17", sourceLocation: "ledger/crypto.java", usageContext: "Ledger archive", dataState: "At rest", environment: "Production", sensitivity: "Confidential", criticality: "High", riskLevel: "High", classicalRisk: "Low", quantumRisk: "Low", quantumVulnerable: false, hndlExposure: false, dataLifetimeYears: 4, migrationMonths: 3, confidence: 86, evidence: "scanner", provenance: "Java AST" },
];

describe("inventory utilities", () => {
  it("derives summary metrics only from the observed finding population", () => {
    expect(buildInventorySummary(findings)).toEqual({ totalAssets: 2, critical: 1, quantumVulnerable: 1, hndlExposed: 1, averageConfidence: 90 });
  });
  it("filters evidence by search and observed quantum state without fabricating state labels", () => {
    expect(filterInventoryFindings(findings, { query: "gateway", assetType: "all", risk: "all", quantum: "all", application: "all" }).map(finding => finding.findingKey)).toEqual(["rsa"]);
    expect(filterInventoryFindings(findings, { query: "", assetType: "all", risk: "all", quantum: "vulnerable", application: "all" }).map(finding => finding.findingKey)).toEqual(["rsa"]);
  });
  it("supports deterministic multi-sort with a shift-appended secondary key", () => {
    const sorting = nextInventorySort(nextInventorySort([], "risk"), "algorithm", true);
    expect(sorting).toEqual([{ key: "risk", direction: "asc" }, { key: "algorithm", direction: "asc" }]);
    expect(sortInventoryFindings(findings, [{ key: "risk", direction: "desc" }]).map(finding => finding.findingKey)).toEqual(["rsa", "aes"]);
  });
  it("exports only the selected observed asset in the CycloneDX-oriented CBOM shape", () => {
    const cbom = buildSingleAssetCbom({ displayName: "Evidence test", finding: findings[0]! });
    expect(cbom.components).toHaveLength(1);
    expect(cbom.components[0]).toMatchObject({ "bom-ref": "rsa", name: "Payment TLS" });
    expect(cbom.components[0]?.properties).toContainEqual({ name: "ecdat:evidence", value: "scanner" });
  });
  it("builds an escaped HTML assessment for only the selected observed asset", () => {
    const html = buildSingleAssetHtmlReport({ displayName: "Evidence <test>", finding: { ...findings[0]!, assetName: "Payment <TLS>" }, recommendation: { title: "Rotate signing", candidate: "ML-DSA-65", migrationNotes: "Validate <HSM> support.", priority: 1 } });
    expect(html).toContain("ECDAT asset report");
    expect(html).toContain("Payment &lt;TLS&gt;");
    expect(html).toContain("Validate &lt;HSM&gt; support.");
    expect(html).not.toContain("<TLS>");
  });
  it("does not select an evidence detail panel without an explicit deep link", () => {
    expect(inventoryFindingFromSearch("?risk=critical")).toBeNull();
    expect(inventoryFindingFromSearch("?finding=rsa&risk=critical")).toBe("rsa");
  });
});
