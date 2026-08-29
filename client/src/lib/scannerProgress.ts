export type ScannerPhase = "idle" | "running" | "complete" | "error";

export const scannerStages = [
  { id: "scope", label: "Scope accepted", detail: "Preparing the deterministic demonstration target", scanner: "Scenario coordinator" },
  { id: "ast", label: "AST scanner", detail: "Simulating cryptographic API discovery", scanner: "AST scanner" },
  { id: "dependencies", label: "Dependency analyzer", detail: "Simulating library and version analysis", scanner: "Dependency analyzer" },
  { id: "container", label: "Container inspector", detail: "Simulating environment and package context", scanner: "Container inspector" },
  { id: "catalogue", label: "CBOM cataloguing", detail: "Preparing evidence-backed asset records", scanner: "CBOM cataloguer" },
] as const;

export function scannerStageIndex(elapsedMs: number) {
  return Math.min(scannerStages.length - 1, Math.max(0, Math.floor(elapsedMs / 520)));
}

export function scannerProgressPercent(elapsedMs: number) {
  return Math.min(92, 12 + scannerStageIndex(elapsedMs) * 20);
}

export function simulatedDiscoveryEvents(elapsedMs: number) {
  return scannerStageIndex(elapsedMs) + 1;
}
