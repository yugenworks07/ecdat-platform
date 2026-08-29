import { describe, expect, it } from "vitest";
import { chooseActiveSource, selectLatestScanKey } from "../client/src/lib/activeScanSelection";

describe("active ECDAT scan selection", () => {
  const scans = [{ scanKey: "scan_latest" }, { scanKey: "scan_older" }];

  it("selects the newest persisted scan only for an authenticated user", () => {
    expect(selectLatestScanKey(scans, true)).toBe("scan_latest");
    expect(selectLatestScanKey(scans, false)).toBeUndefined();
  });

  it("falls back to the public seeded scenario for signed-out and empty-history states", () => {
    expect(chooseActiveSource({ isAuthenticated: false, saved: { name: "saved" }, fallback: { name: "preview" } })).toEqual({ name: "preview" });
    expect(chooseActiveSource({ isAuthenticated: true, saved: undefined, fallback: { name: "preview" } })).toEqual({ name: "preview" });
  });

  it("prefers persisted scan data for an authenticated user", () => {
    expect(chooseActiveSource({ isAuthenticated: true, saved: { name: "saved" }, fallback: { name: "preview" } })).toEqual({ name: "saved" });
  });
});
