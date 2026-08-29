import { describe, expect, it } from "vitest";
import { completedScanIntakeReset, postScanDestination } from "./scanCompletion";

describe("postScanDestination", () => {
  it("keeps completed scans in the Command Center instead of opening an evidence drawer", () => {
    expect(postScanDestination()).toBe("/");
  });

  it("returns the intake to an enabled, submission-ready idle state after completion", () => {
    expect(completedScanIntakeReset()).toEqual({ scannerPhase: "idle", cataloguedAssets: undefined });
  });
});
