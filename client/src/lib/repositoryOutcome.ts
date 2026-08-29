import { classifyRepositoryOutcome, repositoryOutcomeForKind, repositoryOutcomeKinds, type RepositoryContextSignal, type RepositoryOutcome } from "@shared/repositoryOutcome";

type OutcomeAssumption = { assumptionKey: string; label: string; value: string };
type OutcomeFinding = { quantumVulnerable: boolean; classicalRisk: string };

export function outcomeFromRepositoryScan(input: { isRepositoryScan: boolean; assumptions: OutcomeAssumption[]; findings: OutcomeFinding[] }) {
  if (!input.isRepositoryScan) return undefined;
  const contextSignals: RepositoryContextSignal[] = input.assumptions
    .filter(assumption => assumption.assumptionKey.startsWith("context-signal-") && assumption.value === "observed")
    .map(assumption => ({ id: assumption.assumptionKey.replace("context-signal-", "") as RepositoryContextSignal["id"], label: assumption.label }));
  const persistedKind = input.assumptions.find(assumption => assumption.assumptionKey === "repository-outcome")?.value;
  const outcome = repositoryOutcomeKinds.includes(persistedKind as (typeof repositoryOutcomeKinds)[number])
    ? repositoryOutcomeForKind(persistedKind as (typeof repositoryOutcomeKinds)[number])
    : classifyRepositoryOutcome({ findings: input.findings, contextSignals });
  return {
    outcome: outcome as RepositoryOutcome,
    contextSignals,
    coverageIncomplete: input.assumptions.some(assumption => assumption.assumptionKey === "repository-coverage" && assumption.value === "incomplete"),
  };
}
