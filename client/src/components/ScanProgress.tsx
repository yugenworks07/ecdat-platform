import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, FileSearch, LoaderCircle, Radar, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scannerProgressPercent, scannerStageIndex, scannerStages, simulatedDiscoveryEvents, type ScannerPhase } from "@/lib/scannerProgress";

type ScanProgressProps = { phase: ScannerPhase; target: string; totalAssets?: number; onRetry?: () => void };

export function ScanProgress({ phase, target, totalAssets, onRetry }: ScanProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (phase !== "running") return;
    setElapsed(0);
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAt), 120);
    return () => window.clearInterval(timer);
  }, [phase]);

  const stageIndex = phase === "complete" ? scannerStages.length - 1 : scannerStageIndex(elapsed);
  const progress = phase === "complete" ? 100 : scannerProgressPercent(elapsed);
  const activeStage = scannerStages[stageIndex];
  const isError = phase === "error";

  return <section aria-live="polite" className={`mt-4 overflow-hidden rounded-2xl border p-4 ${isError ? "border-rose-300/20 bg-rose-300/[0.05]" : "border-cyan-200/15 bg-[#071321]"}`}>
    <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isError ? "bg-rose-300/10 text-rose-100" : phase === "complete" ? "bg-emerald-300/10 text-emerald-100" : "bg-cyan-300/10 text-cyan-100"}`}>{isError ? <CircleAlert className="h-4 w-4" /> : phase === "complete" ? <CheckCircle2 className="h-4 w-4" /> : <LoaderCircle className="h-4 w-4 animate-spin" />}</span><div className="min-w-0"><p className="text-xs font-semibold text-slate-100">{isError ? "Scenario scan could not be saved" : phase === "complete" ? "Evidence-backed scenario saved" : "Simulated scanner progress"}</p><p className="mt-1 truncate text-[11px] leading-5 text-slate-500">{target || "Deterministic ECDAT demonstration target"}</p></div></div>{!isError ? <span className="text-xs font-semibold text-cyan-100">{progress}%</span> : null}</div>
    {isError ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-rose-100/85">No scan records were changed. Retry the deterministic scenario when the workspace connection is available.</p>{onRetry ? <Button size="sm" variant="outline" onClick={onRetry} className="border-rose-200/20 bg-transparent text-rose-100">Retry scenario</Button> : null}</div> : <><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-cyan-200 to-emerald-200 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"><div className="flex items-center gap-2"><ScanLine className="h-3.5 w-3.5 text-cyan-100" /><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{activeStage.scanner}</p></div><p className="mt-2 text-xs font-medium text-slate-100">{activeStage.label}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{phase === "complete" ? "Scenario records are now available to the active assessment." : activeStage.detail}</p></div><div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"><div className="flex items-center gap-2"><Radar className="h-3.5 w-3.5 text-violet-200" /><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Discovery counter</p></div><p className="mt-2 text-xs font-medium text-slate-100">{phase === "complete" ? `${totalAssets ?? 0} CBOM assets catalogued` : `${simulatedDiscoveryEvents(elapsed)} simulated discovery events`}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{phase === "complete" ? "Saved scenario result" : "UI simulation only; no repository files are accessed."}</p></div></div><div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-600">{scannerStages.map((stage, index) => <span key={stage.id} className={index <= stageIndex ? "text-cyan-100" : ""}>{index < stageIndex || phase === "complete" ? "✓" : index === stageIndex ? "•" : "○"} {stage.label}</span>)}</div><p className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-slate-500"><FileSearch className="mt-0.5 h-3 w-3 shrink-0" />This is a transparent visual simulation of the deterministic scenario run. ECDAT does not clone or inspect the provided repository.</p></>}</section>;
}
