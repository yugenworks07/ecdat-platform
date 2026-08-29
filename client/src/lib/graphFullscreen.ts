export function isGraphFullscreen(fullscreenElement: Element | null, graphElement: Element | null) {
  return Boolean(graphElement && fullscreenElement === graphElement);
}

export function graphFullscreenLabels(active: boolean) {
  return active
    ? { action: "Exit full screen", ariaLabel: "Exit full-screen Dependency Graph view" }
    : { action: "Full screen", ariaLabel: "Open Dependency Graph in full screen" };
}
