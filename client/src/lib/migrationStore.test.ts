import { describe, expect, it } from "vitest";
import { addPlanItem, dismissCompletedPlanItem, getPlan, migrationProgress, nextMigrationStatus, removePlanItem, returnPlanItemToDiscovered, updatePlanItemStatus, type MigrationDraft, type MigrationItem } from "./migrationStore";

const draft: MigrationDraft = { findingKey: "rsa", assetName: "Payment TLS", algorithm: "RSA-2048", candidate: "Hybrid TLS", priority: "P1", complexity: "Indicative: 2–5 engineer-weeks" };
const planned: MigrationItem = { ...draft, status: "Planned", addedAt: 1 };

describe("migration plan store", () => {
  it("adds only unique evidence-backed items with a planned starting state", () => {
    const items = addPlanItem([], draft, 42);
    expect(items).toEqual([{ ...draft, status: "Planned", addedAt: 42 }]);
    expect(addPlanItem(items, draft, 43)).toEqual(items);
  });
  it("cycles status and supports explicit plan removal without affecting other findings", () => {
    expect(nextMigrationStatus("Planned")).toBe("In Progress");
    expect(nextMigrationStatus("In Progress")).toBe("Complete");
    expect(nextMigrationStatus("Complete")).toBe("Planned");
    const updated = updatePlanItemStatus([planned, { ...planned, findingKey: "ecdsa" }], "rsa");
    expect(updated[0].status).toBe("In Progress");
    expect(removePlanItem(updated, "rsa").map(item => item.findingKey)).toEqual(["ecdsa"]);
  });
  it("distinguishes completed-plan dismissal from returning an item to discovered", () => {
    const complete = [{ ...planned, status: "Complete" as const }];
    expect(dismissCompletedPlanItem(complete, [], "rsa")).toEqual({ items: [], dismissedFindingKeys: ["rsa"] });
    expect(returnPlanItemToDiscovered(complete, ["rsa"], "rsa")).toEqual({ items: [], dismissedFindingKeys: [] });
  });
  it("reports progress relative to the available generated candidates", () => {
    expect(migrationProgress([{ ...planned, status: "Complete" }, { ...planned, findingKey: "ecdsa", status: "In Progress" }], 4)).toMatchObject({ total: 4, plannedItems: 2, Complete: 1, "In Progress": 1, Planned: 0, completePercent: 25 });
  });
  it("returns a visible warning rather than silently failing when browser storage is unavailable", () => {
    expect(getPlan()).toEqual({ items: [], dismissedFindingKeys: [], warning: "Migration-plan storage is unavailable in this environment." });
  });
});
