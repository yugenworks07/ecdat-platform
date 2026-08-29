import { Check, CircleDot } from "lucide-react";

const stages = ["Found", "Proposed", "Applied", "Tested", "Verified"];

export function LabPipeline({ stage, unlocked, onSelect }: { stage: number; unlocked: number; onSelect: (stage: number) => void }) {
  return <nav aria-label="Remediation stages" className="grid gap-2 sm:grid-cols-5">{stages.map((label, index) => { const number = index + 1; const active = number === stage; const available = number <= unlocked; return <button key={label} disabled={!available} onClick={() => onSelect(number)} className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${active ? "border-cyan-200/35 bg-cyan-300/[0.09] text-cyan-50" : "border-white/[0.08] bg-white/[0.025] text-slate-400 hover:border-white/15"}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${number < stage ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : active ? "border-cyan-200/40 bg-cyan-300/10 text-cyan-100" : "border-white/10 text-slate-600"}`}>{number < stage ? <Check className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}</span><span><span className="block text-[10px] font-semibold uppercase tracking-[0.12em]">0{number}</span><span className="mt-0.5 block text-xs font-medium">{label}</span></span></button>; })}</nav>;
}
