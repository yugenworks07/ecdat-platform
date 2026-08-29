export type GraphViewport = {
  x: number;
  y: number;
  scale: number;
};

export const GRAPH_MIN_ZOOM = 0.45;
export const GRAPH_MAX_ZOOM = 3;

export function clampGraphZoom(value: number) {
  return Math.max(GRAPH_MIN_ZOOM, Math.min(GRAPH_MAX_ZOOM, Number(value.toFixed(2))));
}

export function panGraphViewport(viewport: GraphViewport, deltaX: number, deltaY: number): GraphViewport {
  return { ...viewport, x: viewport.x + deltaX, y: viewport.y + deltaY };
}

export function zoomGraphAtPoint(viewport: GraphViewport, requestedScale: number, pointX: number, pointY: number): GraphViewport {
  const scale = clampGraphZoom(requestedScale);
  if (scale === viewport.scale) return viewport;

  const worldX = (pointX - viewport.x) / viewport.scale;
  const worldY = (pointY - viewport.y) / viewport.scale;
  return {
    x: Number((pointX - worldX * scale).toFixed(2)),
    y: Number((pointY - worldY * scale).toFixed(2)),
    scale,
  };
}
