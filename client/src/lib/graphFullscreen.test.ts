import { describe, expect, it } from "vitest";
import { graphFullscreenLabels, isGraphFullscreen } from "./graphFullscreen";

describe("Dependency Graph full-screen helpers", () => {
  it("recognises only the graph container as the active full-screen element", () => {
    const graph = {} as Element;
    expect(isGraphFullscreen(graph, graph)).toBe(true);
    expect(isGraphFullscreen({} as Element, graph)).toBe(false);
    expect(isGraphFullscreen(null, graph)).toBe(false);
  });

  it("uses clear accessible labels for entering and exiting full screen", () => {
    expect(graphFullscreenLabels(false)).toMatchObject({ action: "Full screen", ariaLabel: "Open Dependency Graph in full screen" });
    expect(graphFullscreenLabels(true)).toMatchObject({ action: "Exit full screen", ariaLabel: "Exit full-screen Dependency Graph view" });
  });
});
