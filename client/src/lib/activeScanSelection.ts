export type ScanIdentity = { scanKey: string };

export function selectLatestScanKey(scans: ScanIdentity[] | undefined, isAuthenticated: boolean) {
  return isAuthenticated ? scans?.[0]?.scanKey : undefined;
}

export function chooseActiveSource<T>(input: { isAuthenticated: boolean; saved: T | undefined; fallback: T | undefined }) {
  return input.isAuthenticated && input.saved ? input.saved : input.fallback;
}
