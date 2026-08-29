type Relationship = {
  sourceNode: string;
  targetNode: string;
  relationship: string;
};

type Finding = {
  assetName: string;
  algorithm: string;
  library: string | null;
  riskLevel: string;
  quantumVulnerable: boolean;
  classicalRisk: string;
};

function nodeLabel(node: string) {
  const separator = node.indexOf(":");
  return separator === -1 ? node : node.slice(separator + 1);
}

export function buildBlastRadius(relationships: Relationship[]) {
  const reverseEdges = new Map<string, string[]>();
  relationships.forEach(edge => {
    const existing = reverseEdges.get(edge.targetNode) ?? [];
    reverseEdges.set(edge.targetNode, [...existing, edge.sourceNode]);
  });

  const focusNodes = Array.from(
    new Set(
      relationships
        .map(edge => edge.targetNode)
        .filter(node => node.startsWith("library:") || node.startsWith("algorithm:"))
    )
  );

  return focusNodes.map(focusNode => {
    const visited = new Set([focusNode]);
    const queue = [focusNode];
    while (queue.length) {
      const current = queue.shift()!;
      for (const neighbour of reverseEdges.get(current) ?? []) {
        if (!visited.has(neighbour)) {
          visited.add(neighbour);
          queue.push(neighbour);
        }
      }
    }
    const affectedServices = Array.from(visited).filter(node => node.startsWith("service:")).map(nodeLabel);
    const affectedEndpoints = Array.from(visited).filter(node => node.startsWith("endpoint:")).map(nodeLabel);
    const affectedAssets = Array.from(visited).filter(node => node.startsWith("asset:")).map(nodeLabel);
    return {
      focusNode,
      label: nodeLabel(focusNode),
      affectedServices,
      affectedEndpoints,
      affectedAssets,
      affectedCount: affectedServices.length + affectedEndpoints.length + affectedAssets.length,
      explanation: `${nodeLabel(focusNode)} has an evidence-backed path to ${affectedServices.length} service${affectedServices.length === 1 ? "" : "s"}, ${affectedEndpoints.length} endpoint${affectedEndpoints.length === 1 ? "" : "s"}, and ${affectedAssets.length} discovered asset${affectedAssets.length === 1 ? "" : "s"}.`,
    };
  });
}

export function deriveRemediationWaves(findings: Finding[], relationships: Relationship[]) {
  const sharedLibraries = buildBlastRadius(relationships)
    .filter(item => item.focusNode.startsWith("library:") && item.affectedServices.length > 0)
    .sort((a, b) => b.affectedCount - a.affectedCount);
  const immediate = findings.filter(finding => finding.classicalRisk === "High");
  const quantum = findings.filter(finding => finding.quantumVulnerable);

  return [
    {
      wave: 1,
      title: "Remove immediate classical weaknesses",
      rationale: `${immediate.length} evidence-backed finding${immediate.length === 1 ? "" : "s"} carry a high classical-risk classification.`,
      assetNames: immediate.map(finding => finding.assetName),
      dependencySignal: "Prioritised by classical-risk classification.",
    },
    {
      wave: 2,
      title: "Upgrade shared cryptographic dependencies",
      rationale: sharedLibraries[0]
        ? `${sharedLibraries[0].label} has the broadest observed dependency reach in this scan.`
        : "No shared library path was observed in this scan.",
      assetNames: sharedLibraries.slice(0, 2).map(item => item.label),
      dependencySignal: sharedLibraries[0]?.explanation ?? "No dependency concentration identified.",
    },
    {
      wave: 3,
      title: "Introduce quantum-safe migration paths",
      rationale: `${quantum.length} discovered assets are classified as quantum-vulnerable under the current planning inputs.`,
      assetNames: quantum.map(finding => finding.assetName),
      dependencySignal: "Prioritised by quantum-vulnerability classification and current Mosca-style assessment.",
    },
  ];
}
