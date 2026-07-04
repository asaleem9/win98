import {
  SOUND_EVENTS,
  EVENT_BY_ID,
  SOUND_SCHEMES,
  UTOPIA_SCHEME,
  SILENT_SOUND,
  overrideForScheme,
  displayName,
  isSilent,
  baseName,
} from '../soundScheme';

describe('soundScheme', () => {
  it('maps every event to a distinct, non-empty cue with a unique id', () => {
    const sounds = SOUND_EVENTS.map((e) => e.sound);
    expect(sounds.every((s) => typeof s === 'string' && s.length > 0)).toBe(true);
    expect(new Set(sounds).size).toBe(sounds.length);
    const ids = SOUND_EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers the key Win98 system events', () => {
    const ids = new Set(SOUND_EVENTS.map((e) => e.id));
    for (const id of [
      'start-windows',
      'exit-windows',
      'default',
      'asterisk',
      'critical-stop',
      'question',
      'exclamation',
      'menu-command',
      'maximize',
      'minimize',
      'empty-recycle',
    ]) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it('windows-default clears every override', () => {
    for (const e of SOUND_EVENTS) expect(overrideForScheme('windows-default', e.id)).toBeNull();
  });

  it('no-sounds points every event at the silent clip', () => {
    for (const e of SOUND_EVENTS) expect(overrideForScheme('no-sounds', e.id)).toBe(SILENT_SOUND);
    expect(isSilent(SILENT_SOUND)).toBe(true);
    expect(isSilent('/sounds/chord.mp3')).toBe(false);
  });

  it('utopia remaps its mapped events and clears the rest', () => {
    for (const e of SOUND_EVENTS) {
      const url = overrideForScheme('utopia', e.id);
      if (e.id in UTOPIA_SCHEME) expect(url).toBe(UTOPIA_SCHEME[e.id]);
      else expect(url).toBeNull();
    }
    // every remapped key is a real event
    for (const key of Object.keys(UTOPIA_SCHEME)) expect(EVENT_BY_ID[key]).toBeDefined();
  });

  it('displayName reflects default / none / custom states', () => {
    const ev = SOUND_EVENTS[0];
    expect(displayName(null, ev, {})).toBe(ev.defaultName);
    expect(displayName(SILENT_SOUND, ev, {})).toBe('(None)');
    expect(displayName('/sounds/x.mp3', ev, { [ev.id]: 'x.mp3' })).toBe('x.mp3');
    expect(displayName('/sounds/x.mp3', ev, {})).toBe('(Custom)');
  });

  it('baseName extracts the filename from unix and windows paths', () => {
    expect(baseName('C:\\My Documents\\memo.wav')).toBe('memo.wav');
    expect(baseName('/sounds/chord.mp3')).toBe('chord.mp3');
  });

  it('exposes exactly the three schemes', () => {
    expect(SOUND_SCHEMES.map((s) => s.id)).toEqual(['windows-default', 'utopia', 'no-sounds']);
  });
});
