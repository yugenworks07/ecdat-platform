export type EffortWave = { wave: number; indicativeEffort: string };

export function parseEngineerWeekRange(value: string) {
  const match = value.match(/(\d+)\s*[–-]\s*(\d+)\s*engineer-weeks/i);
  if (!match) return undefined;
  return { minimum: Number(match[1]), maximum: Number(match[2]) };
}

export function summarizeIndicativeEffort(waves: EffortWave[]) {
  return waves.reduce((summary, wave) => {
    const range = parseEngineerWeekRange(wave.indicativeEffort);
    if (!range) return summary;
    return { minimum: summary.minimum + range.minimum, maximum: summary.maximum + range.maximum, parsedWaves: summary.parsedWaves + 1 };
  }, { minimum: 0, maximum: 0, parsedWaves: 0 });
}

export function roadmapFindingFromSearch(search: string) {
  return new URLSearchParams(search).get("finding");
}
