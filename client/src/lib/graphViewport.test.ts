import { describe, expect, it } from "vitest";
import { clampGraphZoom, panGraphViewport, zoomGraphAtPoint } from "./graphViewport";

describe("graph free-look viewport", () => {
  it("keeps the requested scene point stationary during trackpad pinch zoom", () => {
    const result = zoomGraphAtPoint({ x: 20, y: -10, scale: 1 }, 1.5, 420, 240);
    expect(result).toEqual({ x: -180, y: -135, scale: 1.5 });
  });

  it("pans without constraining the graph camera to the starting frame", () => {
    expect(panGraphViewport({ x: 12, y: -8, scale: 2 }, 980, -730)).toEqual({ x: 992, y: -738, scale: 2 });
  });

  it("keeps trackpad pinch zoom within the graph’s supported range", () => {
    expect(clampGraphZoom(9)).toBe(3);
    expect(clampGraphZoom(0.1)).toBe(0.45);
  });
});
