import { RadialBar, RadialBarChart } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const readinessConfig = { readiness: { label: "Quantum readiness", color: "#fc4c1f" } } satisfies ChartConfig;

export function ReadinessGauge({ value, label = "Quantum readiness", compact = false }: { value: number; label?: string; compact?: boolean }) {
  const readiness = Math.max(0, Math.min(100, value));
  return <div className={`relative shrink-0 ${compact ? "h-28 w-28" : "h-40 w-40"}`} aria-label={`${readiness}% ${label}`}>
    <ChartContainer config={readinessConfig} className="h-full w-full !aspect-square"><RadialBarChart data={[{ value: readiness, fill: "var(--color-readiness)" }]} startAngle={210} endAngle={-30} innerRadius="68%" outerRadius="100%" barSize={compact ? 9 : 12}><RadialBar dataKey="value" background={{ fill: "rgba(255,255,255,0.08)" }} cornerRadius={12} /></RadialBarChart></ChartContainer>
    <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className={`${compact ? "text-2xl" : "text-4xl"} font-display font-semibold tracking-[-0.05em] text-white`}>{readiness}%</p><p className="mt-1 max-w-[86px] text-[9px] font-semibold uppercase leading-3 tracking-[0.12em] text-slate-500">{label}</p></div></div>
  </div>;
}
