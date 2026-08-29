import { describe, expect, it } from "vitest";
import { buildAttackPath, buildAttackResult } from "./attackTraversal";

describe("attack traversal", () => {
  const nodes = new Map([
    ["service:payments", { id: "service:payments", position: [0, 0, 0] as [number, number, number] }],
    ["asset:tls", { id: "asset:tls", position: [1, 0, 0] as [number, number, number] }],
    ["algorithm:rsa", { id: "algorithm:rsa", position: [2, 0, 0] as [number, number, number] }],
    ["library:openssl", { id: "library:openssl", position: [3, 0, 0] as [number, number, number] }],
  ]);
  const edges = [
    { source: "service:payments", target: "asset:tls" },
    { source: "asset:tls", target: "algorithm:rsa" },
    { source: "algorithm:rsa", target: "library:openssl" },
  ];

  it("builds a bounded breadth-first path over observed visible relationships", () => {
    const steps = buildAttackPath("service:payments", edges, nodes);
    expect(steps.map(step => [step.fromId, step.toId])).toEqual([
      ["service:payments", "asset:tls"],
      ["asset:tls", "algorithm:rsa"],
      ["algorithm:rsa", "library:openssl"],
    ]);
    expect(buildAttackPath("service:payments", edges, nodes, 2)).toHaveLength(2);
  });

  it("returns only current graph evidence and includes the selected source in its summary", () => {
    const steps = buildAttackPath("asset:tls", edges, nodes);
    const result = buildAttackResult("asset:tls", steps);
    expect(result.hitNodes).toContain("asset:tls");
    expect(result.hitNodes).not.toContain("missing:node");
    expect(result.totalSteps).toBe(3);
  });
});
