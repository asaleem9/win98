import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { useWindows } from '@/contexts/WindowContext';
import { WelcomeScreen } from '../WelcomeScreen';

function WindowCountProbe() {
  const { windows } = useWindows();
  return <div data-testid="wincount">{windows.length}</div>;
}

function showWelcomePref(): boolean | undefined {
  const raw = window.localStorage.getItem('win98-prefs-v1');
  if (!raw) return undefined;
  return (JSON.parse(raw) as { system?: { showWelcome?: boolean } }).system?.showWelcome;
}

describe('WelcomeScreen', () => {
  it('renders the Welcome banner and all four options', () => {
    renderWithProviders(<WelcomeScreen onClose={() => {}} />);
    expect(screen.getByText('Welcome to Windows 98')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register Now/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connect to the Internet/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Discover Windows 98/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Maintain Your Computer/ })).toBeInTheDocument();
  });

  it('the show-at-startup checkbox defaults to checked and persists when toggled off', () => {
    renderWithProviders(<WelcomeScreen onClose={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(showWelcomePref()).toBe(false);
  });

  it('reflects a persisted show-welcome preference of false', () => {
    window.localStorage.setItem(
      'win98-prefs-v1',
      JSON.stringify({ system: { showWelcome: false } }),
    );
    renderWithProviders(<WelcomeScreen onClose={() => {}} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('Connect to the Internet opens the AOL window and closes Welcome', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <>
        <WelcomeScreen onClose={onClose} />
        <WindowCountProbe />
      </>,
    );
    expect(screen.getByTestId('wincount')).toHaveTextContent('0');
    fireEvent.click(screen.getByRole('button', { name: /Connect to the Internet/ }));
    expect(screen.getByTestId('wincount')).toHaveTextContent('1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Register Now runs the three-step gag and always fails', async () => {
    renderWithProviders(<WelcomeScreen onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Register Now/ }));
    expect(screen.getByText('Registration Wizard')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next >' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next >' }));
    expect(screen.getByText('Ready to Register')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(
      await screen.findByText(
        'Registration could not be completed. Please try again in 1998.',
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });

  it('Discover Windows 98 walks a four-step coach-mark tour', () => {
    renderWithProviders(<WelcomeScreen onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Discover Windows 98/ }));

    expect(screen.getByText(/Click here to begin/)).toBeInTheDocument();
    expect(screen.getByText('1 of 4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next >' }));
    expect(screen.getByText(/This is the taskbar/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next >' }));
    expect(screen.getByText(/Double-click My Computer/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next >' }));
    expect(screen.getByText('4 of 4')).toBeInTheDocument();

    // Done returns to the main Welcome screen.
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('button', { name: /Register Now/ })).toBeInTheDocument();
  });
});
