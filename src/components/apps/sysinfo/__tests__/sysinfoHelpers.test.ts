import { formatUptime, systemResourcesFree, buildSystemReport } from '../sysinfoHelpers';

describe('formatUptime', () => {
  it('formats zero seconds', () => {
    expect(formatUptime(0)).toBe('00:00:00');
  });

  it('formats seconds and minutes', () => {
    expect(formatUptime(65)).toBe('00:01:05');
  });

  it('formats hours', () => {
    expect(formatUptime(3661)).toBe('01:01:01');
  });

  it('pads double-digit hours normally and does not wrap past 99', () => {
    expect(formatUptime(36000)).toBe('10:00:00');
  });

  it('clamps negative input to zero', () => {
    expect(formatUptime(-50)).toBe('00:00:00');
  });

  it('floors fractional seconds', () => {
    expect(formatUptime(59.9)).toBe('00:00:59');
  });
});

describe('systemResourcesFree', () => {
  it('starts near the initial value at t=0', () => {
    expect(systemResourcesFree(0)).toBe(87);
  });

  it('decreases over time', () => {
    const early = systemResourcesFree(60);
    const later = systemResourcesFree(6000);
    expect(later).toBeLessThan(early);
  });

  it('never reaches or drops below the floor, even after a very long time', () => {
    const value = systemResourcesFree(10_000_000);
    expect(value).toBeGreaterThanOrEqual(12);
  });

  it('treats negative elapsed time as zero', () => {
    expect(systemResourcesFree(-100)).toBe(systemResourcesFree(0));
  });
});

describe('buildSystemReport', () => {
  it('includes uptime and resource readings in the report text', () => {
    const report = buildSystemReport({
      generatedAt: new Date('2026-07-03T12:00:00Z'),
      uptimeSeconds: 3661,
      resourcesFree: 45,
    });
    expect(report).toContain('Windows Uptime: 01:01:01');
    expect(report).toContain('System Resources Free: 45%');
    expect(report).toContain('Microsoft System Information Report');
  });
});
