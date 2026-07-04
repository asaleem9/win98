import { render, screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { getSoundOverride, setSoundOverride } from '@/lib/sounds';
import SoundsProperties from '../SoundsProperties';
import { SOUND_EVENTS, SILENT_SOUND, UTOPIA_SCHEME } from '../soundScheme';

function clearOverrides() {
  for (const e of SOUND_EVENTS) setSoundOverride(e.sound, null);
}

describe('SoundsProperties', () => {
  beforeEach(clearOverrides);
  afterEach(clearOverrides);

  it('lists the system events', () => {
    renderWithProviders(<SoundsProperties windowId="w1" />);
    expect(screen.getByText('Start Windows')).toBeInTheDocument();
    expect(screen.getByText('Empty Recycle Bin')).toBeInTheDocument();
  });

  it('None assigns the silent clip to the selected event and persists it', () => {
    renderWithProviders(<SoundsProperties windowId="w1" />);
    // The first event (Start Windows → startup) is selected by default.
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'None' }));
    });
    expect(getSoundOverride('startup')).toBe(SILENT_SOUND);
    const prefs = JSON.parse(window.localStorage.getItem('win98-prefs-v1')!);
    expect(prefs['system-sounds'].startup).toBe(SILENT_SOUND);
  });

  it('No Sounds silences every event; Windows Default clears them', () => {
    renderWithProviders(<SoundsProperties windowId="w1" />);
    const select = screen.getByLabelText('Sound scheme');
    act(() => {
      fireEvent.change(select, { target: { value: 'no-sounds' } });
    });
    for (const e of SOUND_EVENTS) expect(getSoundOverride(e.sound)).toBe(SILENT_SOUND);
    act(() => {
      fireEvent.change(select, { target: { value: 'windows-default' } });
    });
    for (const e of SOUND_EVENTS) expect(getSoundOverride(e.sound)).toBeNull();
  });

  it('Utopia sets overrides that survive an assign → reload → playSound cycle', () => {
    const { unmount } = renderWithProviders(<SoundsProperties windowId="w1" />);
    const select = screen.getByLabelText('Sound scheme');
    act(() => {
      fireEvent.change(select, { target: { value: 'utopia' } });
    });
    expect(getSoundOverride('startup')).toBe(UTOPIA_SCHEME['start-windows']);
    const prefs = JSON.parse(window.localStorage.getItem('win98-prefs-v1')!);
    expect(prefs['system-sounds'].startup).toBe(UTOPIA_SCHEME['start-windows']);

    unmount();
    // Simulate a fresh boot: wipe the live sound layer, then re-hydrate from
    // persisted prefs the way SettingsContext does on load.
    clearOverrides();
    expect(getSoundOverride('startup')).toBeNull();
    act(() => {
      render(
        <SettingsProvider>
          <div />
        </SettingsProvider>,
      );
    });
    expect(getSoundOverride('startup')).toBe(UTOPIA_SCHEME['start-windows']);
  });

  it('Preview plays the selected event without throwing', () => {
    renderWithProviders(<SoundsProperties windowId="w1" />);
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Preview' }))).not.toThrow();
  });

  it('Browse opens the audio file picker', () => {
    renderWithProviders(<SoundsProperties windowId="w1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Browse...' }));
    expect(screen.getByText('Browse for Sound')).toBeInTheDocument();
    expect(screen.getByText('Sounds (*.wav;*.mp3)')).toBeInTheDocument();
  });
});
