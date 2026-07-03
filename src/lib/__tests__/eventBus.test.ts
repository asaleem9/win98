import { emit, on } from '@/lib/eventBus';

describe('eventBus', () => {
  it('round-trips a detail payload through emit/on', () => {
    const received: Array<{ path: string }> = [];
    const off = on('open-file', (detail) => received.push(detail));
    emit('open-file', { path: 'C:\\readme.txt' });
    off();
    expect(received).toEqual([{ path: 'C:\\readme.txt' }]);
  });

  it('handles detail-less events (no second argument)', () => {
    let calls = 0;
    const off = on('run-dialog', () => {
      calls++;
    });
    emit('run-dialog');
    off();
    expect(calls).toBe(1);
  });

  it('passes typed detail for system-dialog', () => {
    const received: Array<{ message: string; title?: string }> = [];
    const off = on('system-dialog', (detail) => received.push(detail));
    emit('system-dialog', { title: 'Error', message: 'Boom', icon: 'error' });
    off();
    expect(received).toEqual([{ title: 'Error', message: 'Boom', icon: 'error' }]);
  });

  it('unsubscribe stops delivery', () => {
    let calls = 0;
    const off = on('toggle-start', () => {
      calls++;
    });
    emit('toggle-start');
    off();
    emit('toggle-start');
    expect(calls).toBe(1);
  });

  it('supports multiple independent subscribers', () => {
    let a = 0;
    let b = 0;
    const offA = on('bsod', () => {
      a++;
    });
    const offB = on('bsod', () => {
      b++;
    });
    emit('bsod', { message: 'FAULT' });
    offA();
    emit('bsod');
    offB();
    expect(a).toBe(1);
    expect(b).toBe(2);
  });

  it('back-compat: raw window listener receives events emitted via the bus', () => {
    const received: Array<string | undefined> = [];
    const raw = (e: Event) => received.push((e as CustomEvent<{ path?: string }>).detail?.path);
    window.addEventListener('win98-open-file', raw);
    emit('open-file', { path: 'A:\\disk' });
    window.removeEventListener('win98-open-file', raw);
    expect(received).toEqual(['A:\\disk']);
  });

  it('back-compat: on receives events dispatched raw via window', () => {
    const received: Array<{ path: string }> = [];
    const off = on('open-file', (detail) => received.push(detail));
    window.dispatchEvent(new CustomEvent('win98-open-file', { detail: { path: 'B:\\file' } }));
    off();
    expect(received).toEqual([{ path: 'B:\\file' }]);
  });

  it('carries newer additive events (about-dialog, tray-register)', () => {
    const about: Array<{ appName: string }> = [];
    const tray: Array<{ id: string; icon: string }> = [];
    const offAbout = on('about-dialog', (detail) => about.push(detail));
    const offTray = on('tray-register', (detail) => tray.push(detail));
    emit('about-dialog', { appName: 'Notepad', version: '4.10' });
    emit('tray-register', { id: 'volume', icon: 'speaker', tooltip: 'Volume' });
    offAbout();
    offTray();
    expect(about).toEqual([{ appName: 'Notepad', version: '4.10' }]);
    expect(tray).toEqual([{ id: 'volume', icon: 'speaker', tooltip: 'Volume' }]);
  });
});
