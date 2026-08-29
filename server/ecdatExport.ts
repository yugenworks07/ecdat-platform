import { createHash } from "node:crypto";

export type ExportFinding = {
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
};

function cycloneDxSerialNumber(scanKey: string) {
  const digest = createHash("sha256").update(scanKey).digest("hex");
  return `urn:uuid:${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

export function buildCycloneDxOrientedCbom(input: {
  scanKey: string;
  displayName: string;
  createdAt: Date | string;
  findings: ExportFinding[];
}) {
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.6",
    serialNumber: cycloneDxSerialNumber(input.scanKey),
    version: 1,
    metadata: {
      timestamp: new Date(input.createdAt).toISOString(),
      component: { type: "application", name: input.displayName },
    },
    components: input.findings.map(finding => ({
      "bom-ref": finding.findingKey,
      type: finding.assetType.toLowerCase().includes("library") ? "library" : "cryptographic-asset",
      name: finding.assetName,
      version: finding.version ?? undefined,
      properties: [
        { name: "org.ecdat:algorithm", value: finding.algorithm },
        { name: "org.ecdat:role", value: finding.cryptoRole },
        { name: "org.ecdat:library", value: finding.library ?? "Not observed" },
        { name: "org.ecdat:location", value: finding.sourceLocation },
        { name: "org.ecdat:usage-context", value: finding.usageContext },
        { name: "org.ecdat:risk-level", value: finding.riskLevel },
        { name: "org.ecdat:quantum-risk", value: finding.quantumRisk },
        { name: "org.ecdat:confidence", value: `${finding.confidence}%` },
        { name: "org.ecdat:evidence", value: finding.evidence },
        { name: "org.ecdat:provenance", value: finding.provenance },
      ],
    })),
  };
}

export function buildExecutiveHtml(input: {
  displayName: string;
  criticalCount: number;
  quantumVulnerableCount: number;
  hndlCount: number;
  quantumReadiness: number;
  findings: ExportFinding[];
}) {
  const findingRows = input.findings
    .map(
      finding => `<tr><td>${finding.assetName}</td><td>${finding.algorithm}</td><td>${finding.cryptoRole}</td><td>${finding.riskLevel}</td><td>${finding.confidence}%</td></tr>`
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>ECDAT executive report</title><style>body{font-family:Arial,sans-serif;color:#14233d;margin:44px}h1{font-size:28px}table{width:100%;border-collapse:collapse;margin-top:22px}th,td{padding:10px;border-bottom:1px solid #d9e2ef;text-align:left}th{background:#eef4fb}.metric{display:inline-block;padding:14px 18px;margin:0 10px 10px 0;background:#f5f8fc;border-radius:10px}.note{color:#52647d;font-size:12px;margin-top:28px}</style></head><body><h1>ECDAT Executive Report — ${input.displayName}</h1><div class="metric"><strong>${input.criticalCount}</strong><br>Critical findings</div><div class="metric"><strong>${input.quantumVulnerableCount}</strong><br>Quantum-vulnerable assets</div><div class="metric"><strong>${input.hndlCount}</strong><br>Potential HNDL exposures</div><div class="metric"><strong>${input.quantumReadiness}%</strong><br>Quantum readiness</div><h2>Evidence-backed inventory</h2><table><thead><tr><th>Asset</th><th>Algorithm</th><th>Role</th><th>Risk</th><th>Confidence</th></tr></thead><tbody>${findingRows}</tbody></table><p class="note">Effort and latency estimates used by ECDAT are indicative planning aids, not implementation commitments. HNDL entries identify potential exposure under the scan's stated assumptions.</p></body></html>`;
}
