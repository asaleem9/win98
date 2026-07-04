import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import VolumeControl from '../VolumeControl';
import {
  getChannelState,
  setChannelVolume,
  setChannelMuted,
  setChannelBalance,
  setMasterBalance,
} from '@/lib/sounds';

// The sound module keeps channel levels in module scope; reset them so each
// case starts from a known mixer state.
beforeEach(() => {
  for (const ch of ['wave', 'midi', 'cd'] as const) {
    setChannelVolume(ch, 1);
    setChannelMuted(ch, false);
    setChannelBalance(ch, 0);
  }
  setMasterBalance(0);
});

function prefs() {
  return JSON.parse(window.localStorage.getItem('win98-prefs-v1') || '{}');
}

describe('VolumeControl mixer', () => {
  it('renders master plus the wave/midi/cd strips by default', () => {
    renderWithProviders(<VolumeControl windowId="w1" />);
    expect(screen.getByText('Volume Control')).toBeInTheDocument();
    expect(screen.getByText('Wave')).toBeInTheDocument();
    expect(screen.getByText('MIDI')).toBeInTheDocument();
    expect(screen.getByText('CD Audio')).toBeInTheDocument();
    // Master strip reflects the default global volume (0.7 -> 70).
    expect((screen.getByLabelText('Volume Control volume') as HTMLInputElement).value).toBe('70');
  });

  it('drives a channel volume into the sound layer and persists it', () => {
    renderWithProviders(<VolumeControl windowId="w1" />);
    fireEvent.change(screen.getByLabelText('Wave volume'), { target: { value: '30' } });
    expect(getChannelState().wave.volume).toBeCloseTo(0.3);
    expect(prefs().mixer.channels.wave.volume).toBeCloseTo(0.3);
  });

  it('mutes a channel and persists the mute', () => {
    renderWithProviders(<VolumeControl windowId="w1" />);
    // The MIDI strip's Mute checkbox is the third one (master, wave, midi, cd).
    const mutes = screen.getAllByRole('checkbox');
    fireEvent.click(mutes[2]);
    expect(getChannelState().midi.muted).toBe(true);
    expect(prefs().mixer.channels.midi.muted).toBe(true);
  });

  it('persists a channel balance change', () => {
    renderWithProviders(<VolumeControl windowId="w1" />);
    fireEvent.change(screen.getByLabelText('Wave balance'), { target: { value: '-1' } });
    expect(getChannelState().wave.balance).toBeCloseTo(-1);
    expect(prefs().mixer.channels.wave.balance).toBeCloseTo(-1);
  });

  it('hides a column through Options > Properties and persists the choice', () => {
    renderWithProviders(<VolumeControl windowId="w1" />);
    fireEvent.click(screen.getByText((_, el) => el?.tagName === 'SPAN' && el.textContent === 'Options'));
    fireEvent.click(screen.getByText('Properties...'));
    // Uncheck CD Audio in the properties dialog, then apply.
    const cdCheckbox = screen.getByLabelText('CD Audio');
    fireEvent.click(cdCheckbox);
    fireEvent.click(screen.getByText('OK'));
    expect(screen.queryByText('CD Audio')).not.toBeInTheDocument();
    expect(prefs().mixer.columns.cd).toBe(false);
  });
});
