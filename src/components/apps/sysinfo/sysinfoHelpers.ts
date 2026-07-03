// Pure helpers for the uptime clock and the "system resources" gag counter.

/** Formats a duration in seconds as HH:MM:SS, zero-padded. Negative values clamp to 0. */
export function formatUptime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

const RESOURCES_START = 87;
const RESOURCES_FLOOR = 12;
// Decays roughly one percent every ~40 seconds, slowing down as it approaches the floor.
const DECAY_RATE = 0.00025;

/** Slowly decaying "% system resources free" reading. Never reaches the floor, just approaches it. */
export function systemResourcesFree(elapsedSeconds: number): number {
  const t = Math.max(0, elapsedSeconds);
  const value = RESOURCES_FLOOR + (RESOURCES_START - RESOURCES_FLOOR) * Math.exp(-DECAY_RATE * t);
  return Math.round(value);
}

/** Builds the plain-text msinfo report exported by File > Export. */
export function buildSystemReport(opts: { generatedAt: Date; uptimeSeconds: number; resourcesFree: number }): string {
  const { generatedAt, uptimeSeconds, resourcesFree } = opts;
  const lines = [
    'Microsoft System Information Report',
    '=====================================',
    `Generated: ${generatedAt.toLocaleString()}`,
    '',
    'System Summary',
    '-------------------------------------',
    'OS Name: Microsoft Windows 98',
    'Version: 4.10.1998',
    'System Manufacturer: Generic PC',
    'System Model: ATX Desktop',
    '',
    `Windows Uptime: ${formatUptime(uptimeSeconds)}`,
    `System Resources Free: ${resourcesFree}%`,
    '',
    'End of report.',
  ];
  return lines.join('\r\n');
}
