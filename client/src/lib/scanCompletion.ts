/** A completed scan returns to the Command Center; evidence drawers remain explicit user actions. */
export function postScanDestination() {
  return "/";
}

/** Completed scan progress is presentation-only; returning to Command Center always restores a ready intake. */
export function completedScanIntakeReset() {
  return { scannerPhase: "idle" as const, cataloguedAssets: undefined };
}
