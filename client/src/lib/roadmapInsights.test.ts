import { describe, expect, it } from "vitest";
import { parseEngineerWeekRange, roadmapFindingFromSearch, summarizeIndicativeEffort } from "./roadmapInsights";

describe("roadmap insights", () => {
  it("parses the explicit indicative engineer-week range without inferring precision", () => {
    expect(parseEngineerWeekRange("Indicative: 2–5 engineer-weeks")).toEqual({ minimum: 2, maximum: 5 });
  });

  it("summarizes only parseable wave labels", () => {
    expect(summarizeIndicativeEffort([{ wave: 1, indicativeEffort: "Indicative: 1–2 engineer-weeks" }, { wave: 2, indicativeEffort: "Indicative: 4–10 engineer-weeks" }])).toEqual({ minimum: 5, maximum: 12, parsedWaves: 2 });
  });
  it("keeps only an explicit finding key as report-to-roadmap context", () => {
    expect(roadmapFindingFromSearch("?finding=rsa-2048&risk=Critical")).toBe("rsa-2048");
    expect(roadmapFindingFromSearch("?risk=Critical")).toBeNull();
  });
});
