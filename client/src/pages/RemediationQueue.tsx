import { useMemo, useState } from "react";
import { ArrowRight, Filter, FlaskConical, ShieldAlert } from "lucide-react";
import { useRoute } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useActiveEcdatScan } from "@/hooks/useActiveEcdatScan";
import { buildRemediationContext, fallbackFinding, remediationLabWindowPath, riskScoreFor } from "@/lib/remediationLab";
import { rankRemediationFindings } from "@/lib/remediationQueue";

const riskTone: Record<string, string> = {
  Critical: "border-rose-300/25 bg-rose-300/[0.08] text-rose-100",
  High: "border-orange-300/25 bg-orange-300/[0.08] text-orange-100",
  Medium: "border-amber-300/25 bg-amber-300/[0.08] text-amber-100",
  Low: "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100",
};

type ActiveFinding = ReturnType<typeof useActiveEcdatScan>["findings"][number];

const queueFallbackFinding: ActiveFinding = { ...fallbackFinding, assetType: "Service", usageContext: "Authentication service", dataState: "In transit", environment: "Production", sensitivity: "Confidential", criticality: "High", classicalRisk: "High", quantumRisk: "Vulnerable", evidence: "Fallback demonstration finding", provenance: "Seeded preview" };

export default function RemediationQueue() {
  const workspace = useActiveEcdatScan();
  const [, params] = useRoute("/remediation-queue/:scanId");
  const [visibleLevels, setVisibleLevels] = useState(() => new Set(["Critical", "High", "Medium"]));
  const scanId = params?.scanId || workspace.scanKey || "scan-104";
  const findings = workspace.findings.length ? workspace.findings : [queueFallbackFinding];
  const queue = useMemo(() => rankRemediationFindings(findings, visibleLevels), [findings, visibleLevels]);

  const toggleLevel = (level: string) => setVisibleLevels(current => {
    const next = new Set(current);
    if (next.has(level)) next.delete(level); else next.add(level);
    return next;
  });

  return <div className="mx-auto max-w-6xl space-y-6 pb-24">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/70">Prioritized action list</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">Remediation Queue <span className="font-mono text-lg text-slate-500">— {scanId.toUpperCase()}</span></h1>
        <p className="mt-2 text-sm text-slate-400">Findings are ordered by ECDAT risk priority. Opening a Lab creates a scoped, browser-local demonstration workspace only.</p>
      </div>
      <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-500" /><span className="text-xs text-slate-500">Sorted by quantum risk score</span></div>
    </header>

    <section aria-label="Filter findings" className="rounded-2xl border border-white/[0.08] bg-[#081321] p-4">
      <div className="flex flex-wrap items-center gap-2"><span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Severity</span>{["Critical", "High", "Medium", "Low"].map(level => <Button key={level} size="sm" variant="outline" onClick={() => toggleLevel(level)} className={visibleLevels.has(level) ? riskTone[level] : "border-white/10 bg-transparent text-slate-500"}>{visibleLevels.has(level) ? "✓ " : ""}{level}</Button>)}</div>
    </section>

    <section className="space-y-3" aria-label="Ranked remediation findings">
      {queue.map((finding, index) => {
        const context = buildRemediationContext({ scanId, findingId: finding.findingKey, finding, recommendation: workspace.recommendations.find(item => item.findingKey === finding.findingKey), relationshipCount: workspace.relationships.length });
        const score = riskScoreFor(finding.riskLevel, finding.quantumVulnerable);
        return <article key={finding.findingKey} className="grid gap-4 rounded-3xl border border-white/[0.08] bg-[#081321] p-5 transition hover:border-cyan-200/20 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.04] font-mono text-sm font-semibold text-slate-300">#{index + 1}</div>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-semibold text-white">{finding.algorithm} <span className="text-slate-500">· {finding.cryptoRole}</span></h2><Badge variant="outline" className={riskTone[finding.riskLevel] || riskTone.Low}><ShieldAlert className="mr-1 h-3 w-3" />{finding.riskLevel}</Badge></div><p className="mt-2 text-sm text-slate-300">{finding.assetName} <span className="text-slate-600">·</span> {finding.sourceLocation}</p><p className="mt-2 text-xs leading-5 text-slate-500">Mosca signal: {finding.dataLifetimeYears}y data lifetime + {Math.max(1, Math.ceil(finding.migrationMonths / 12))}y migration window; quantum risk score {score}/100. Affected dependency relationships: {workspace.relationships.length || 3}.</p></div>
          <Button onClick={() => window.open(remediationLabWindowPath(context), "_blank", "noopener,noreferrer")} className="bg-cyan-200 text-[#072033] hover:bg-cyan-100"><FlaskConical className="h-4 w-4" />Open Lab<ArrowRight className="h-4 w-4" /></Button>
        </article>;
      })}
      {!queue.length ? <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center"><p className="font-display text-xl text-slate-200">No findings match this filter.</p><p className="mt-2 text-sm text-slate-500">Enable a severity level to return it to the remediation queue.</p></div> : null}
    </section>
    <p className="text-center text-xs text-slate-500">Showing {queue.length} of {findings.length} findings</p>
  </div>;
}
