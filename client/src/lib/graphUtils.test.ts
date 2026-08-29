import { describe, expect, it } from "vitest";
import { buildEdges, computeBlastRadius, computeChain, extractNodes } from "./graphUtils";

const relationships = [
  { sourceNode: "service:billing", targetNode: "library:openssl", relationship: "DEPENDS_ON", evidence: "lockfile", confidence: 95 },
  { sourceNode: "library:openssl", targetNode: "algorithm:RSA-2048", relationship: "IMPLEMENTS", evidence: "config", confidence: 91 },
  { sourceNode: "endpoint:public-api", targetNode: "service:billing", relationship: "EXPOSES", evidence: "route", confidence: 92 },
];
const findings = [{ findingKey: "rsa", assetName: "Billing TLS", algorithm: "RSA-2048", library: "openssl", riskLevel: "Critical" }];

describe("graph evidence utilities", () => {
  it("extracts deterministic typed nodes from observed relationships", () => {
    const nodes = extractNodes(relationships, findings);
    expect(nodes.map(node => node.id)).toHaveLength(4);
    expect(nodes.find(node => node.id === "service:billing")).toMatchObject({ type: "service", column: 0 });
    expect(nodes.find(node => node.id === "algorithm:RSA-2048")?.findingKeys).toEqual(["rsa"]);
  });

  it("connects only observed positioned edges and marks chain edges", () => {
    const nodes = extractNodes(relationships, findings);
    const edges = buildEdges(relationships, nodes, new Set(["endpoint:public-api", "service:billing"]));
    expect(edges).toHaveLength(3);
    expect(edges.filter(edge => edge.highlighted)).toHaveLength(1);
  });

  it("returns bidirectional chain members without adding topology", () => {
    expect([...computeChain("service:billing", relationships)]).toEqual(expect.arrayContaining(["endpoint:public-api", "library:openssl", "algorithm:RSA-2048"]));
  });

  it("returns a reverse observed dependency lens with caveated complexity", () => {
    const result = computeBlastRadius("algorithm:RSA-2048", relationships);
    expect([...result.nodeIds]).toEqual(expect.arrayContaining(["algorithm:RSA-2048", "library:openssl", "service:billing", "endpoint:public-api"]));
    expect(result).toMatchObject({ services: 1, endpoints: 1, assets: 2, complexity: "Focused" });
  });
});
