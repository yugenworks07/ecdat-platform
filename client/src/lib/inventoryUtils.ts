export type InventoryFinding = {
  findingKey: string;
  assetName: string;
  assetType: string;
  algorithm: string;
  cryptoRole: string;
  library: string | null;
  version: string | null;
  sourceLocation: string;
  usageContext: string;
  dataState: string;
  environment: string;
  sensitivity: string;
  criticality: string;
  riskLevel: string;
  classicalRisk: string;
  quantumRisk: string;
  quantumVulnerable: boolean;
  hndlExposure: boolean;
  dataLifetimeYears: number;
  migrationMonths: number;
  confidence: number;
  evidence: string;
  provenance: string;
};

export const inventoryColumnKeys = ["risk", "assetName", "assetType", "algorithm", "cryptoRole", "library", "version", "sourceLocation", "dataState", "environment", "criticality", "confidence", "evidence"] as const;
export type InventoryColumnKey = (typeof inventoryColumnKeys)[number];
export const inventoryColumns: Array<{ key: InventoryColumnKey; label: string; sortable: boolean }> = [
  { key: "risk", label: "Risk", sortable: true }, { key: "assetName", label: "Asset name", sortable: true }, { key: "assetType", label: "Type", sortable: true }, { key: "algorithm", label: "Algorithm", sortable: true }, { key: "cryptoRole", label: "Role", sortable: true }, { key: "library", label: "Library", sortable: true }, { key: "version", label: "Version", sortable: true }, { key: "sourceLocation", label: "Source", sortable: true }, { key: "dataState", label: "Data state", sortable: true }, { key: "environment", label: "Environment", sortable: true }, { key: "criticality", label: "Criticality", sortable: true }, { key: "confidence", label: "Confidence", sortable: true }, { key: "evidence", label: "Evidence", sortable: false },
];
export type InventorySortKey = Exclude<InventoryColumnKey, "risk" | "evidence"> | "risk";
export type InventorySort = { key: InventorySortKey; direction: "asc" | "desc" };
export type InventoryFilters = { query: string; assetType: string; risk: string; quantum: string; application: string };

const riskRank: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const textValue = (value: string | null | undefined) => value?.toLocaleLowerCase() ?? "";

export function buildInventorySummary(findings: InventoryFinding[]) {
  const totalAssets = findings.length;
  return {
    totalAssets,
    critical: findings.filter(finding => finding.riskLevel === "Critical").length,
    quantumVulnerable: findings.filter(finding => finding.quantumVulnerable).length,
    hndlExposed: findings.filter(finding => finding.hndlExposure).length,
    averageConfidence: totalAssets ? Math.round(findings.reduce((sum, finding) => sum + finding.confidence, 0) / totalAssets) : 0,
  };
}

export function inventoryOptions(findings: InventoryFinding[]) {
  return {
    assetTypes: Array.from(new Set(findings.map(finding => finding.assetType).filter(Boolean))).sort(),
    quantumStates: Array.from(new Set(findings.filter(finding => !finding.quantumVulnerable).map(finding => finding.quantumRisk).filter(Boolean))).sort(),
  };
}

export function filterInventoryFindings(findings: InventoryFinding[], filters: InventoryFilters) {
  const query = filters.query.trim().toLocaleLowerCase();
  return findings.filter(finding => {
    const searchSource = [finding.assetName, finding.algorithm, finding.library, finding.usageContext, finding.sourceLocation].map(textValue).join(" ");
    const matchesSearch = !query || searchSource.includes(query);
    const matchesType = filters.assetType === "all" || finding.assetType === filters.assetType;
    const matchesRisk = filters.risk === "all" || finding.riskLevel === filters.risk;
    const matchesQuantum = filters.quantum === "all" || (filters.quantum === "vulnerable" ? finding.quantumVulnerable : !finding.quantumVulnerable && finding.quantumRisk === filters.quantum);
    // A single active scan currently has one observed application/service context; keep the filter explicit without inventing per-row ownership.
    const matchesApplication = filters.application === "all" || filters.application === "active";
    return matchesSearch && matchesType && matchesRisk && matchesQuantum && matchesApplication;
  });
}

export function sortInventoryFindings<T extends InventoryFinding>(findings: T[], sorting: InventorySort[]) {
  return [...findings].sort((left, right) => {
    for (const sort of sorting) {
      const leftValue = sort.key === "risk" ? riskRank[left.riskLevel] ?? 0 : left[sort.key];
      const rightValue = sort.key === "risk" ? riskRank[right.riskLevel] ?? 0 : right[sort.key];
      const comparison = typeof leftValue === "number" && typeof rightValue === "number" ? leftValue - rightValue : String(leftValue ?? "").localeCompare(String(rightValue ?? ""));
      if (comparison) return sort.direction === "asc" ? comparison : -comparison;
    }
    return left.findingKey.localeCompare(right.findingKey);
  });
}

export function nextInventorySort(current: InventorySort[], key: InventorySortKey, append = false): InventorySort[] {
  const existing = current.find(sort => sort.key === key);
  const nextDirection = existing?.direction === "asc" ? "desc" : "asc";
  const next = { key, direction: nextDirection } as InventorySort;
  if (!append) return [next];
  return existing ? current.map(sort => sort.key === key ? next : sort) : [...current, next];
}

export function loadInventoryColumns(storageKey: string, fallback = [...inventoryColumnKeys]): InventoryColumnKey[] {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[];
    const valid = stored.filter((column): column is InventoryColumnKey => inventoryColumnKeys.includes(column as InventoryColumnKey));
    return valid.length ? valid : fallback;
  } catch { return fallback; }
}

export function saveInventoryColumns(storageKey: string, columns: InventoryColumnKey[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(storageKey, JSON.stringify(columns));
}

export function buildSingleAssetCbom(input: { displayName: string; finding: InventoryFinding }) {
  const { finding } = input;
  return {
    bomFormat: "ECDAT CycloneDX-oriented CBOM",
    specVersion: "0.1",
    serialNumber: `urn:uuid:ecdat-${finding.findingKey}`,
    metadata: { timestamp: new Date().toISOString(), component: { type: "application", name: input.displayName }, tools: [{ vendor: "ECDAT", name: "ECDAT", version: "0.1.0" }], note: "Single observed asset export. Validate the selected target schema before production use." },
    components: [{ "bom-ref": finding.findingKey, type: finding.assetType.toLowerCase().includes("library") ? "library" : "cryptographic-asset", name: finding.assetName, version: finding.version ?? undefined, properties: [{ name: "ecdat:algorithm", value: finding.algorithm }, { name: "ecdat:role", value: finding.cryptoRole }, { name: "ecdat:library", value: finding.library ?? "Not observed" }, { name: "ecdat:location", value: finding.sourceLocation }, { name: "ecdat:usage-context", value: finding.usageContext }, { name: "ecdat:risk-level", value: finding.riskLevel }, { name: "ecdat:quantum-risk", value: finding.quantumRisk }, { name: "ecdat:confidence", value: `${finding.confidence}%` }, { name: "ecdat:evidence", value: finding.evidence }, { name: "ecdat:provenance", value: finding.provenance }] }],
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function buildSingleAssetHtmlReport(input: { displayName: string; finding: InventoryFinding; recommendation?: { title: string; candidate: string; migrationNotes: string; priority: number } }) {
  const { finding, recommendation } = input;
  const fields = [
    ["Asset", finding.assetName], ["Algorithm", finding.algorithm], ["Cryptographic role", finding.cryptoRole], ["Library", finding.library ?? "Not observed"], ["Version", finding.version ?? "Not observed"], ["Source location", finding.sourceLocation], ["Usage context", finding.usageContext], ["Data handling", `${finding.dataState} · ${finding.sensitivity} · ${finding.environment}`], ["Risk", finding.riskLevel], ["Classical / quantum", `${finding.classicalRisk} · ${finding.quantumRisk}`], ["Potential HNDL", finding.hndlExposure ? "Qualified planning context" : "Not qualified"], ["Data lifetime", `${finding.dataLifetimeYears} years`], ["Migration window", `${finding.migrationMonths} months · indicative`], ["Confidence", `${finding.confidence}%`], ["Evidence", finding.evidence], ["Provenance", finding.provenance],
  ] as const;
  const rows = fields.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("");
  const recommendationSection = recommendation ? `<section><h2>Recommended migration path</h2><article class="recommendation"><p class="eyebrow">Generated recommendation · P${recommendation.priority}</p><h3>${escapeHtml(recommendation.title)}</h3><p class="candidate">${escapeHtml(finding.algorithm)} → ${escapeHtml(recommendation.candidate)}</p><p>${escapeHtml(recommendation.migrationNotes)}</p></article></section>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ECDAT asset report — ${escapeHtml(finding.algorithm)}</title><style>body{margin:0;background:#f6f7f9;color:#172033;font:15px/1.55 system-ui,-apple-system,sans-serif}.page{max-width:900px;margin:0 auto;padding:48px 28px}header,section{background:#fff;border:1px solid #dbe0e8;border-radius:18px;padding:28px;margin-bottom:20px}.eyebrow{margin:0;color:#b9381d;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{margin:8px 0 0;font-size:32px;line-height:1.2}h2{font-size:17px;margin:0 0 16px}h3{margin:8px 0;font-size:18px}.subtle{color:#5a667a}.badges{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.badge{background:#fff0ed;border:1px solid #efb4a5;border-radius:999px;color:#9d321c;padding:4px 10px;font-size:13px;font-weight:700}table{border-collapse:collapse;width:100%}th,td{border-top:1px solid #e3e7ed;padding:11px 0;text-align:left;vertical-align:top}th{width:34%;color:#5a667a;font-size:12px;letter-spacing:.05em;text-transform:uppercase}.recommendation{background:#fff5f2;border:1px solid #efb4a5;border-radius:12px;padding:18px}.candidate{color:#b9381d;font-weight:700}.notice{background:#fffbeb;border:1px solid #f4d89c;border-radius:12px;padding:14px;color:#735716;font-size:13px}footer{color:#6c7789;font-size:12px;padding:0 4px}</style></head><body><main class="page"><header><p class="eyebrow">ECDAT · Observed asset report</p><h1>${escapeHtml(finding.algorithm)}</h1><p class="subtle">${escapeHtml(finding.assetName)} · ${escapeHtml(input.displayName)}</p><div class="badges"><span class="badge">${escapeHtml(finding.riskLevel)} risk</span><span class="badge">${finding.quantumVulnerable ? "Quantum-vulnerable" : "Quantum monitored"}</span><span class="badge">${finding.confidence}% confidence</span></div></header><section><h2>Observed asset evidence</h2><table><tbody>${rows}</tbody></table></section>${recommendationSection}<p class="notice">Observed evidence and derived planning values are supplied for assessment. They are not proof of runtime reachability, exploitability, or an implementation commitment.</p><footer>Generated by ECDAT on ${new Date().toISOString()}.</footer></main></body></html>`;
}

/** Inventory stays full-width until a row or an explicit `?finding=` link selects evidence. */
export function inventoryFindingFromSearch(search: string) {
  return new URLSearchParams(search).get("finding");
}
