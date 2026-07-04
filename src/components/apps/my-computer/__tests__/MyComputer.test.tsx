import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { useWindows } from '@/contexts/WindowContext';
import MyComputer from '../MyComputer';

beforeEach(() => {
  window.localStorage.clear();
});

// Surfaces the shared window-manager state so we can assert what My Computer opened.
function WindowProbe() {
  const { windows } = useWindows();
  return <div data-testid="open-apps">{windows.map((w) => w.appId).join(',')}</div>;
}

describe('My Computer', () => {
  it('shows the local drives', () => {
    renderWithProviders(<MyComputer windowId="w1" />);
    expect(screen.getByText('(C:)')).toBeInTheDocument();
    expect(screen.getByText('3½ Floppy (A:)')).toBeInTheDocument();
    expect(screen.queryByText(/on Dads-computer/)).not.toBeInTheDocument();
  });

  it('renders a mapped network drive from the saved pref', () => {
    window.localStorage.setItem(
      'win98-prefs-v1',
      JSON.stringify({
        'network-neighborhood': {
          mappedDrive: {
            letter: 'Z:',
            path: '\\\\DADS-COMPUTER\\shared',
            share: 'shared',
            hostDisplay: 'Dads-computer',
            reconnect: true,
          },
        },
      }),
    );
    renderWithProviders(<MyComputer windowId="w1" />);
    expect(screen.getByText('shared on Dads-computer (Z:)')).toBeInTheDocument();
  });

  it('opens the CD Player when the D: drive is double-clicked', () => {
    renderWithProviders(
      <>
        <MyComputer windowId="w1" />
        <WindowProbe />
      </>,
    );
    fireEvent.doubleClick(screen.getByText('(D:)'));
    expect(screen.getByTestId('open-apps').textContent).toContain('cd-player');
  });

  it('reports an audio CD in the D: drive properties', () => {
    renderWithProviders(<MyComputer windowId="w1" />);
    fireEvent.contextMenu(screen.getByText('(D:)'));
    fireEvent.click(screen.getByText('Properties'));
    expect(screen.getByText("Now That's What I Call 1998")).toBeInTheDocument();
    expect(screen.getByText('Audio CD')).toBeInTheDocument();
  });
});
