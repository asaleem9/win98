import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import MyComputer from '../MyComputer';

beforeEach(() => {
  window.localStorage.clear();
});

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
});
