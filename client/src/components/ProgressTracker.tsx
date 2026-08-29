import type { MigrationItem } from "@/lib/migrationStore";
import { migrationProgress } from "@/lib/migrationStore";

export function ProgressTracker({ items, availableCount }: { items: MigrationItem[]; availableCount: number }) {
  const progress = migrationProgress(items, availableCount);
  const denominator = Math.max(1, progress.total);
  const segments = [
    { label: "Done", count: progress.Complete, className: "bg-emerald-300" },
    { label: "In progress", count: progress["In Progress"], className: "bg-cyan-300" },
    { label: "Planned", count: progress.Planned, className: "bg-violet-300" },
  ];
  return <section className="rounded-3xl border border-white/8 bg-[#091423] p-5 md:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/60">Execution progress</p><h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.03em] text-white">Migration plan progress</h2></div><p className="text-sm font-medium text-cyan-100">{progress.plannedItems}/{progress.total} candidate{progress.total === 1 ? "" : "s"} planned</p></div><div className="mt-5 flex h-3 overflow-hidden rounded-full bg-white/[0.07]" aria-label={`${progress.completePercent}% of generated migration candidates complete`}>{segments.map(segment => segment.count ? <span key={segment.label} className={segment.className} style={{ width: `${(segment.count / denominator) * 100}%` }} /> : null)}</div><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">{segments.map(segment => <span key={segment.label} className="flex items-center gap-2"><i className={`h-2 w-2 rounded-full ${segment.className}`} />{segment.label}: {segment.count}</span>)}</div><p className="mt-4 text-xs leading-5 text-slate-500">Status is stored locally in this browser. Planning progress tracks explicit plan additions; it does not claim production implementation completion.</p></section>;
}
