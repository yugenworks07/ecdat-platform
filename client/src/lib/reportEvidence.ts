export type ReportFinding = {
  findingKey: string;
  assetName: string;
  assetType: string;
  algorithm: string;
  cryptoRole: string;
  library: string | null;
  version: string | null;
  sourceLocation: string;
  usageContext: string;
  confidence: number;
  evidence: string;
  provenance: string;
  riskLevel: string;
  quantumRisk: string;
  quantumVulnerable: boolean;
  hndlExposure: boolean;
  migrationMonths: number;
};

export type ReportRecommendation = {
  findingKey: string;
  title: string;
  candidate: string;
  migrationNotes: string;
  priority: number;
};

export type ReportRelationship = { sourceNode: string; targetNode: string; relationship: string; evidence: string; confidence: number };
export type EvidenceStatus = "Observed" | "Derived" | "Estimated" | "Recommended";
export type ReportPackageKey = "executive" | "technical" | "quantum" | "migration";

export const reportPackages: Array<{ key: ReportPackageKey; title: string; audience: string; coverage: string }> = [
  { key: "executive", title: "Executive posture", audience: "For leadership and decision makers", coverage: "Risk · Readiness · HNDL · Priorities" },
  { key: "technical", title: "Technical CBOM", audience: "For security and engineering teams", coverage: "Assets · Evidence · Dependencies" },
  { key: "quantum", title: "Quantum risk", audience: "For post-quantum planning", coverage: "Mosca · HNDL · Vulnerability" },
  { key: "migration", title: "Migration plan", audience: "For engineering execution", coverage: "Priorities · Waves · Dependencies" },
];

const riskWeight: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
const riskOrder = (left: ReportFinding, right: ReportFinding) => riskWeight[right.riskLevel] - riskWeight[left.riskLevel] || Number(right.quantumVulnerable) - Number(left.quantumVulnerable) || right.confidence - left.confidence;
const nodeLabel = (node: string) => node.replace(/^[^:]+:/, "");

function hasSourceEvidence(finding: ReportFinding) {
  return Boolean(finding.evidence.trim() && finding.sourceLocation.trim());
}

function relationCountForFinding(finding: ReportFinding, relationships: ReportRelationship[]) {
  const terms = [finding.assetName, finding.algorithm, finding.library ?? ""].filter(Boolean).map(term => term.toLowerCase());
  return relationships.filter(relationship => {
    const edge = `${nodeLabel(relationship.sourceNode)} ${nodeLabel(relationship.targetNode)}`.toLowerCase();
    return terms.some(term => edge.includes(term));
  }).length;
}

function serviceCountForFinding(finding: ReportFinding, relationships: ReportRelationship[]) {
  const terms = [finding.assetName, finding.algorithm, finding.library ?? ""].filter(Boolean).map(term => term.toLowerCase());
  const services = new Set<string>();
  relationships.forEach(relationship => {
    const edge = `${nodeLabel(relationship.sourceNode)} ${nodeLabel(relationship.targetNode)}`.toLowerCase();
    if (terms.some(term => edge.includes(term))) {
      [relationship.sourceNode, relationship.targetNode].filter(node => node.startsWith("service:")).forEach(node => services.add(node));
    }
  });
  return services.size;
}

export function buildReportEvidenceModel(input: {
  displayName: string;
  totalAssets: number;
  criticalCount: number;
  quantumVulnerableCount: number;
  hndlCount: number;
  quantumReadiness: number;
  findings: ReportFinding[];
  recommendations: ReportRecommendation[];
  relationships: ReportRelationship[];
}) {
  const findings = [...input.findings].sort(riskOrder);
  const sourceBacked = findings.filter(hasSourceEvidence).length;
  const lowConfidence = findings.filter(finding => finding.confidence < 70).length;
  const riskCounts = (['Critical', 'High', 'Medium', 'Low'] as const).map(level => ({ level, count: findings.filter(finding => finding.riskLevel === level).length }));
  const primaryFinding = findings[0] ?? null;
  const recommendationByFinding = new Map(input.recommendations.map(recommendation => [recommendation.findingKey, recommendation]));

  return {
    ...input,
    findings,
    riskCounts,
    sourceBacked,
    lowConfidence,
    coveragePercent: findings.length ? Math.round((sourceBacked / findings.length) * 100) : 0,
    primaryFinding,
    recommendationByFinding,
    relationCountForFinding: (finding: ReportFinding) => relationCountForFinding(finding, input.relationships),
    serviceCountForFinding: (finding: ReportFinding) => serviceCountForFinding(finding, input.relationships),
  };
}

export function buildEvidenceChain(
  finding: ReportFinding,
  recommendation: ReportRecommendation | undefined,
  relationships: ReportRelationship[]
): Array<{ label: string; value: string; detail: string; status: EvidenceStatus }> {
  const relationCount = relationCountForFinding(finding, relationships);
  const serviceCount = serviceCountForFinding(finding, relationships);
  return [
    { label: "Evidence", value: finding.sourceLocation || "Source location not recorded", detail: finding.evidence || "No evidence text was retained for this finding.", status: "Observed" },
    { label: "Context", value: [finding.library, finding.version].filter(Boolean).join(" ") || finding.usageContext, detail: `${finding.assetName} · ${finding.cryptoRole}`, status: "Observed" },
    { label: "Risk", value: `${finding.riskLevel} · ${finding.quantumRisk}`, detail: finding.hndlExposure ? "Potential HNDL exposure is derived from the assessment inputs." : "Risk classification is derived from the active assessment inputs.", status: "Derived" },
    { label: "Impact lens", value: `${relationCount} observed relationship${relationCount === 1 ? "" : "s"}`, detail: serviceCount ? `${serviceCount} observed service context${serviceCount === 1 ? "" : "s"}; this is not runtime reachability or exploit evidence.` : "No service context was observed in the relationship set.", status: "Derived" },
    { label: "Planning estimate", value: finding.migrationMonths ? `${finding.migrationMonths} month migration window` : "No duration estimate", detail: "Planning estimates are indicative and require implementation validation.", status: "Estimated" },
    { label: "Recommendation", value: recommendation?.candidate ?? "No generated recommendation", detail: recommendation?.migrationNotes ?? "No generated migration guidance is available for this finding.", status: "Recommended" },
  ];
}

function escapeHtml(value: string | number) {
  return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character] ?? character);
}

export function buildEvidenceReportHtml(input: {
  packageKey: ReportPackageKey;
  generatedAt: Date;
  model: ReturnType<typeof buildReportEvidenceModel>;
}) {
  const report = reportPackages.find(item => item.key === input.packageKey) ?? reportPackages[0];
  const scopedFindings = input.packageKey === "quantum" ? input.model.findings.filter(finding => finding.quantumVulnerable || finding.hndlExposure) : input.model.findings;
  const rows = scopedFindings.slice(0, input.packageKey === "technical" ? 50 : 12).map(finding => `<tr><td>${escapeHtml(finding.assetName)}</td><td>${escapeHtml(finding.algorithm)}</td><td>${escapeHtml(finding.riskLevel)}</td><td>${escapeHtml(finding.confidence)}%</td><td>${escapeHtml(finding.sourceLocation)}</td></tr>`).join("");
  const recommendationRows = input.model.recommendations.slice(0, 10).map(recommendation => `<li><strong>${escapeHtml(recommendation.title)}</strong> — ${escapeHtml(recommendation.candidate)}</li>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>ECDAT ${escapeHtml(report.title)} — ${escapeHtml(input.model.displayName)}</title><style>body{font-family:Arial,sans-serif;color:#14233d;margin:44px;line-height:1.45}h1{font-size:28px;margin-bottom:4px}.eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#357c8b}.metric{display:inline-block;padding:14px 18px;margin:0 10px 10px 0;background:#f5f8fc;border-radius:10px}.label{font-size:12px;color:#52647d}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px;border-bottom:1px solid #d9e2ef;text-align:left;font-size:13px}th{background:#eef4fb}.note{color:#52647d;font-size:12px;margin-top:28px}li{margin:8px 0}</style></head><body><p class="eyebrow">ECDAT / Evidence & Reports</p><h1>${escapeHtml(report.title)} — ${escapeHtml(input.model.displayName)}</h1><p>Generated ${escapeHtml(input.generatedAt.toLocaleString())}. This package is derived from the active assessment evidence, risk evaluation, and generated migration guidance.</p><div class="metric"><strong>${escapeHtml(input.model.totalAssets)}</strong><br><span class="label">Assets</span></div><div class="metric"><strong>${escapeHtml(input.model.criticalCount)}</strong><br><span class="label">Critical findings</span></div><div class="metric"><strong>${escapeHtml(input.model.quantumVulnerableCount)}</strong><br><span class="label">Quantum-vulnerable</span></div><div class="metric"><strong>${escapeHtml(input.model.quantumReadiness)}%</strong><br><span class="label">Quantum readiness</span></div><h2>Evidence coverage</h2><p>${escapeHtml(input.model.sourceBacked)} of ${escapeHtml(input.model.findings.length)} findings retain source evidence (${escapeHtml(input.model.coveragePercent)}%).</p><h2>Evidence-backed inventory</h2><table><thead><tr><th>Asset</th><th>Algorithm</th><th>Risk</th><th>Confidence</th><th>Source evidence</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No matching findings were available.</td></tr>'}</tbody></table><h2>Generated recommendations</h2><ul>${recommendationRows || "<li>No generated recommendations were available.</li>"}</ul><p class="note">Observed fields are recorded in scan evidence. Risk and impact lenses are derived from the assessment and observed relationship set. Planning estimates and recommendations require implementation validation; relationship context is not a runtime reachability or exploit claim.</p></body></html>`;
}
