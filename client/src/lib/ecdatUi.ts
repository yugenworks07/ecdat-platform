export const scenarioIds = ["python-web", "java-enterprise", "container-mesh", "compliance-heavy"] as const;
export type ScenarioId = (typeof scenarioIds)[number];
export const riskTone: Record<string, string> = { Critical: "bg-rose-400/12 text-rose-200 ring-rose-300/25", High: "bg-amber-300/12 text-amber-100 ring-amber-200/25", Medium: "bg-cyan-300/10 text-cyan-100 ring-cyan-200/20", Low: "bg-emerald-300/10 text-emerald-100 ring-emerald-200/20" };
export const riskDot: Record<string, string> = { Critical: "bg-rose-300", High: "bg-amber-200", Medium: "bg-cyan-200", Low: "bg-emerald-300" };
export const defaultScenario = "python-web" as ScenarioId;
export function downloadText(filename: string, content: string, type: string) { const objectUrl = URL.createObjectURL(new Blob([content], { type })); const anchor = document.createElement("a"); anchor.href = objectUrl; anchor.download = filename; anchor.click(); URL.revokeObjectURL(objectUrl); }
