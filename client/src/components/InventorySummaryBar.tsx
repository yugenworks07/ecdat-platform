import { Boxes, ShieldAlert, ScanSearch, LockKeyhole, BadgeCheck } from "lucide-react";

const cards = [
  { key: "totalAssets", label: "Total assets", icon: Boxes, tone: "text-cyan-100 border-cyan-200/12 bg-cyan-300/[0.04]" },
  { key: "critical", label: "Critical", icon: ShieldAlert, tone: "text-rose-100 border-rose-200/12 bg-rose-300/[0.04]" },
  { key: "quantumVulnerable", label: "Quantum-vulnerable", icon: ScanSearch, tone: "text-violet-100 border-violet-200/12 bg-violet-300/[0.04]" },
  { key: "hndlExposed", label: "HNDL exposed", icon: LockKeyhole, tone: "text-amber-100 border-amber-200/12 bg-amber-300/[0.04]" },
  { key: "averageConfidence", label: "Avg. confidence", icon: BadgeCheck, tone: "text-emerald-100 border-emerald-200/12 bg-emerald-300/[0.04]" },
] as const;

export function InventorySummaryBar({ summary }: { summary: { totalAssets: number; critical: number; quantumVulnerable: number; hndlExposed: number; averageConfidence: number } }) {
  return <section aria-label="Inventory summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{cards.map(card => { const Icon = card.icon; const raw = summary[card.key]; return <article key={card.key} className={`rounded-2xl border p-4 ${card.tone}`}><div className="flex items-start justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{card.label}</p><Icon className="h-4 w-4 opacity-70" /></div><p className="mt-2 font-mono text-2xl font-semibold tracking-[-0.04em] text-white">{card.key === "averageConfidence" ? `${raw}%` : raw}</p></article>; })}</section>;
}
