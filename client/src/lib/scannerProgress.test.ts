import { describe, expect, it } from "vitest";
import { scannerProgressPercent, scannerStageIndex, simulatedDiscoveryEvents } from "./scannerProgress";

describe("scanner progress helpers", () => {
  it("advances through bounded simulated scanner stages", () => {
    expect(scannerStageIndex(0)).toBe(0);
    expect(scannerStageIndex(1040)).toBe(2);
    expect(scannerStageIndex(99999)).toBe(4);
  });

  it("keeps in-flight progress below completion and derives only labelled discovery events", () => {
    expect(scannerProgressPercent(0)).toBe(12);
    expect(scannerProgressPercent(99999)).toBe(92);
    expect(simulatedDiscoveryEvents(1560)).toBe(4);
  });
});
