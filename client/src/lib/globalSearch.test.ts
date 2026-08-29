import { describe, expect, it } from "vitest";
import { buildGlobalSearchItems } from "./globalSearch";

describe("global workspace search", () => {
  it("routes observed evidence directly to its persisted or seeded inventory detail", () => {
    const items = buildGlobalSearchItems([{ findingKey: "rsa", assetName: "TLS entrypoint", algorithm: "RSA-2048", riskLevel: "High", quantumVulnerable: true, hndlExposure: true }], [{ findingKey: "rsa", title: "Migrate TLS", candidate: "ML-KEM", priority: 1 }]);
    expect(items.find(item => item.group === "Observed evidence")).toMatchObject({ path: "/inventory?finding=rsa", detail: expect.stringContaining("potential HNDL") });
    expect(items.find(item => item.group === "Generated guidance")?.path).toBe("/migration?finding=rsa");
  });
});
