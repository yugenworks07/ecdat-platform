import type { getScanDetail } from "./ecdat";

type ScanDetail = Awaited<ReturnType<typeof getScanDetail>>;

export type CopilotMessage = { role: "user" | "assistant"; content: string };
export type CopilotReply = { content: string; focusFindingKey: string | null };

export function buildCryptoAnalystPrompt(detail: ScanDetail) {
  const assumptions = detail.assumptions.map(item => `${item.label}: ${item.value} ${item.unit}`).join("; ");
  const findings = detail.findings.slice(0, 16).map(finding => `- ${finding.findingKey}: ${finding.algorithm} in ${finding.assetName}; ${finding.riskLevel} risk; role ${finding.cryptoRole}; quantum-vulnerable ${finding.quantumVulnerable ? "yes" : "no"}; potential HNDL ${finding.hndlExposure ? "yes" : "no"}; source ${finding.sourceLocation}`).join("\n");
  const relationships = detail.relationships.slice(0, 24).map(item => `- ${item.sourceNode} → ${item.targetNode} (${item.relationship})`).join("\n");
  const recommendations = detail.recommendations.slice(0, 12).map(item => `- ${item.findingKey}: ${item.candidate}; ${item.compatibility}; ${item.indicativeEffort}; ${item.indicativeLatency}`).join("\n");
  const waves = detail.waves.slice(0, 8).map(item => `- Wave ${item.wave}: ${item.title}; ${item.scope}; ${item.indicativeEffort}`).join("\n");

  return `You are ECDAT's AI Crypto Analyst. Answer only from the supplied active scan context. You assist security engineers with evidence-backed cryptographic triage and post-quantum migration planning.

Active scan: ${detail.scan.displayName}
Metrics: ${detail.scan.totalAssets} assets; ${detail.scan.quantumVulnerableCount} quantum-vulnerable; ${detail.scan.hndlCount} potential HNDL; ${detail.scan.quantumReadiness}% readiness.
Planning assumptions: ${assumptions}.

Observed findings:
${findings}

Observed relationships:
${relationships}

Generated migration recommendations:
${recommendations}

Migration waves:
${waves}

Rules:
- Reference only listed findings, relationships, recommendations, and waves. Never invent evidence, vulnerabilities, exploitation, affected production systems, or facts not in this context.
- Treat the Mosca inputs, CRQC horizon, effort, and latency as planning assumptions or indicative estimates, not certainty or a prediction.
- When asked about propagation, explain it as illustrative reachability over observed dependency paths, not an actual attack simulation or exploit proof.
- Be concise, specific, and actionable for a security engineer.
- If one observed finding best matches the answer, set focusFindingKey to that exact finding key; otherwise return null.
- Do not provide legal, incident-response, or production-change instructions.`;
}

export function buildCopilotOutputSchema(findingKeys: string[]) {
  return {
    name: "ecdat_crypto_analyst_reply",
    strict: true,
    schema: {
      type: "object",
      properties: {
        content: { type: "string" },
        focusFindingKey: { type: ["string", "null"], enum: [...findingKeys, null] },
      },
      required: ["content", "focusFindingKey"],
      additionalProperties: false,
    },
  };
}

export function parseCopilotReply(raw: string, findingKeys: string[]): CopilotReply {
  try {
    const candidate = JSON.parse(raw) as Partial<CopilotReply>;
    const content = typeof candidate.content === "string" ? candidate.content.trim() : "";
    const focusFindingKey = typeof candidate.focusFindingKey === "string" && findingKeys.includes(candidate.focusFindingKey) ? candidate.focusFindingKey : null;
    if (content) return { content, focusFindingKey };
  } catch {
    // A safe plain-text fallback is preferable to presenting an empty response.
  }
  return { content: raw.trim() || "No scan-grounded response was generated.", focusFindingKey: null };
}
