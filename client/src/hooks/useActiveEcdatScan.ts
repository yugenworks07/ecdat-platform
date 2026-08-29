import { useAuth } from "@/_core/hooks/useAuth";
import { defaultScenario } from "@/lib/ecdatUi";
import { getStaticScenario, isStaticDeployment } from "@/lib/staticDemo";
import { trpc } from "@/lib/trpc";
import { chooseActiveSource, selectLatestScanKey } from "@/lib/activeScanSelection";
import { outcomeFromRepositoryScan } from "@/lib/repositoryOutcome";
import type { RepositoryContextSignal, RepositoryOutcome } from "@shared/repositoryOutcome";

type ActiveScanView = {
  displayName: string;
  totalAssets: number;
  criticalCount: number;
  quantumVulnerableCount: number;
  hndlCount: number;
  quantumReadiness: number;
  findings: Array<{ findingKey: string; assetName: string; assetType: string; algorithm: string; library: string | null; version: string | null; usageContext: string; sourceLocation: string; confidence: number; evidence: string; provenance: string; cryptoRole: string; dataState: string; environment: string; sensitivity: string; criticality: string; classicalRisk: string; quantumRisk: string; dataLifetimeYears: number; migrationMonths: number; quantumVulnerable: boolean; hndlExposure: boolean; riskLevel: string }>;
  recommendations: Array<{ findingKey: string; recommendationType: string; title: string; candidate: string; migrationNotes: string; compatibility: string; indicativeEffort: string; indicativeLatency: string; priority: number }>;
  relationships: Array<{ sourceNode: string; targetNode: string; relationship: string; evidence: string; confidence: number }>;
  waves: Array<{ wave: number; title: string; rationale: string; scope: string; indicativeEffort: string; dependencies: string }>;
  assumptions: unknown[];
  repositoryOutcome?: { outcome: RepositoryOutcome; contextSignals: RepositoryContextSignal[]; coverageIncomplete: boolean };
};

export function useActiveEcdatScan() {
  const { isAuthenticated } = useAuth();
  const qaState = typeof window !== "undefined" && import.meta.env.DEV
    ? new URLSearchParams(window.location.search).get("qaState")
    : null;
  const scans = trpc.ecdat.scans.useQuery(undefined, { enabled: isAuthenticated && !isStaticDeployment });
  const scanKey = selectLatestScanKey(scans.data, isAuthenticated);
  const detail = trpc.ecdat.detail.useQuery({ scanKey: scanKey ?? "pending" }, { enabled: Boolean(scanKey) && !isStaticDeployment });
  const preview = trpc.ecdat.preview.useQuery({ scenario: defaultScenario }, { enabled: !isStaticDeployment });
  const saved: ActiveScanView | undefined = detail.data ? {
    displayName: detail.data.scan.displayName,
    totalAssets: detail.data.scan.totalAssets,
    criticalCount: detail.data.scan.criticalCount,
    quantumVulnerableCount: detail.data.scan.quantumVulnerableCount,
    hndlCount: detail.data.scan.hndlCount,
    quantumReadiness: detail.data.scan.quantumReadiness,
    findings: detail.data.findings,
    recommendations: detail.data.recommendations,
    relationships: detail.data.relationships,
    waves: detail.data.waves,
    assumptions: detail.data.assumptions,
    repositoryOutcome: outcomeFromRepositoryScan({
      isRepositoryScan: detail.data.scan.scenario === "repository-static",
      assumptions: detail.data.assumptions,
      findings: detail.data.findings,
    }),
  } : undefined;
  const staticPreview = isStaticDeployment ? getStaticScenario(defaultScenario) : undefined;
  const fallback: ActiveScanView | undefined = preview.data
    ? { ...preview.data, assumptions: [] }
    : staticPreview
      ? { ...staticPreview, assumptions: [] }
      : undefined;
  const active = chooseActiveSource({ isAuthenticated, saved, fallback });
  const forceEmpty = qaState === "empty";
  const forceError = qaState === "error";
  const forceLoading = qaState === "loading";
  const forcePreview = qaState === "preview";
  const resolvedActive = forcePreview ? fallback : active;
  return {
    scanKey,
    isAuthenticated,
    usingSavedScan: Boolean(!forcePreview && isAuthenticated && saved),
    isForceLoading: forceLoading,
    isLoading: forceLoading || (!forceEmpty && !forceError && (scans.isLoading || detail.isLoading || preview.isLoading)),
    hasError: forceError || Boolean(scans.error || detail.error || preview.error),
    retry: () => isStaticDeployment ? Promise.resolve() : Promise.all([scans.refetch(), detail.refetch(), preview.refetch()]),
    displayName: resolvedActive?.displayName ?? "Loading scenario",
    totalAssets: resolvedActive?.totalAssets ?? 0,
    criticalCount: resolvedActive?.criticalCount ?? 0,
    quantumVulnerableCount: resolvedActive?.quantumVulnerableCount ?? 0,
    hndlCount: resolvedActive?.hndlCount ?? 0,
    quantumReadiness: resolvedActive?.quantumReadiness ?? 0,
    findings: forceEmpty ? [] : resolvedActive?.findings ?? [],
    recommendations: forceEmpty ? [] : resolvedActive?.recommendations ?? [],
    relationships: forceEmpty ? [] : resolvedActive?.relationships ?? [],
    waves: forceEmpty ? [] : resolvedActive?.waves ?? [],
    assumptions: resolvedActive?.assumptions ?? [],
    repositoryOutcome: resolvedActive?.repositoryOutcome,
    recentScans: scans.data ?? [],
    detail,
  };
}
