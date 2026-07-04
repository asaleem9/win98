import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import DisplayProperties from '../DisplayProperties';

// The live preview and fullscreen preview render lazy canvas savers; stub them
// so this suite can focus on the tab's controls and persistence.
vi.mock('@/components/system/ScreenSaverManager', () => ({
  ScreenSaverManager: () => null,
  ScreenSaverView: () => null,
}));

const SAVER_NAMES = [
  '(None)',
  'Flying Windows',
  'Starfield Simulation',
  'Mystify Your Mind',
  '3D Pipes',
  'Scrolling Marquee',
  '3D Maze',
];

function openScreenSaverTab() {
  renderWithProviders(<DisplayProperties windowId="w1" />);
  fireEvent.click(screen.getByText('Screen Saver'));
}

function storedSettings() {
  const raw = window.localStorage.getItem('win98-settings-v1');
  return raw ? JSON.parse(raw) : null;
}

describe('DisplayProperties — Screen Saver tab', () => {
  it('lists every saver in the dropdown', () => {
    openScreenSaverTab();
    for (const name of SAVER_NAMES) {
      expect(screen.getByRole('option', { name })).toBeInTheDocument();
    }
  });

  it('hides the Marquee settings until Marquee is selected', () => {
    openScreenSaverTab();
    expect(screen.queryByLabelText('Marquee text')).toBeNull();

    const saverSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(saverSelect, { target: { value: 'marquee' } });

    expect(screen.getByLabelText('Marquee text')).toBeInTheDocument();
    expect(screen.getByLabelText('Marquee speed')).toBeInTheDocument();
  });

  it('persists marquee text and speed on Apply', () => {
    openScreenSaverTab();
    const saverSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(saverSelect, { target: { value: 'marquee' } });

    fireEvent.change(screen.getByLabelText('Marquee text'), {
      target: { value: 'Custom Msg' },
    });
    fireEvent.change(screen.getByLabelText('Marquee speed'), {
      target: { value: '7' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    const saved = storedSettings();
    expect(saved.screenSaver.id).toBe('marquee');
    expect(saved.screenSaver.marqueeText).toBe('Custom Msg');
    expect(saved.screenSaver.marqueeSpeed).toBe(7);
  });

  it('loads a legacy save without marquee fields and defaults gracefully', () => {
    window.localStorage.setItem(
      'win98-settings-v1',
      JSON.stringify({ screenSaver: { id: 'pipes', timeoutMinutes: 5 } }),
    );
    openScreenSaverTab();

    // The persisted saver id survives the load
    const saverSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    expect(saverSelect.value).toBe('pipes');

    // Switching to Marquee shows the backfilled default text, not undefined
    fireEvent.change(saverSelect, { target: { value: 'marquee' } });
    expect(screen.getByLabelText('Marquee text')).toHaveValue('Your message here.');
  });
});
