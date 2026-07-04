import { render, screen, fireEvent, act } from '@testing-library/react';
import Home from '../page';

// Keep the running desktop light: the state machine, boot, login and welcome
// screens stay real; the heavy shell children are stubbed out.
vi.mock('@/components/desktop/Desktop', () => ({
  Desktop: () => <div data-testid="desktop" />,
}));
vi.mock('@/components/window/WindowManager', () => ({
  WindowManager: () => null,
}));
vi.mock('@/components/taskbar/Taskbar', () => ({
  Taskbar: () => <div data-testid="taskbar" />,
}));
vi.mock('@/components/system/ShellShortcuts', () => ({
  ShellShortcuts: () => null,
}));
vi.mock('@/components/system/ShellEventHost', () => ({
  ShellEventHost: () => null,
}));
vi.mock('@/components/dialogs/DialogHost', () => ({
  DialogHost: () => null,
}));
vi.mock('@/components/system/ScreenSaverManager', () => ({
  ScreenSaverManager: () => null,
}));

const PROMPT = 'Type a user name and password to log on to Windows.';

function prefs(): Record<string, unknown> {
  const raw = window.localStorage.getItem('win98-prefs-v1');
  return raw ? (JSON.parse(raw) as { system?: Record<string, unknown> }).system ?? {} : {};
}

async function logIn(name?: string) {
  if (name !== undefined) {
    fireEvent.change(screen.getByLabelText('User name'), { target: { value: name } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'OK' }));
  await screen.findByTestId('desktop');
}

describe('Home system state machine', () => {
  it('boots to the login screen, then to the running desktop', async () => {
    render(<Home />);

    // Full boot on first run, then the logon dialog
    expect(screen.getByText(/Memory Test:/)).toBeInTheDocument();
    await screen.findByText(PROMPT, {}, { timeout: 6000 });

    await logIn('Neo');

    // Running desktop + first-run Welcome
    expect(screen.getByText('Welcome to Windows 98')).toBeInTheDocument();
    expect(prefs().userName).toBe('Neo');
    expect(prefs().hasBooted).toBe(true);
  });

  it('takes the fast boot path when hasBooted is already set', async () => {
    window.localStorage.setItem(
      'win98-prefs-v1',
      JSON.stringify({ system: { hasBooted: true } }),
    );
    render(<Home />);

    // The fast path jumps to the flag without counting memory (the POST frame
    // may flash once to keep hydration consistent).
    await screen.findByText('Click anywhere to skip');
    expect(screen.queryByText(/Memory Test:/)).not.toBeInTheDocument();
    await screen.findByText(PROMPT, {}, { timeout: 4000 });
  });

  it('honors a disabled show-welcome preference', async () => {
    window.localStorage.setItem(
      'win98-prefs-v1',
      JSON.stringify({ system: { hasBooted: true, showWelcome: false } }),
    );
    render(<Home />);
    await screen.findByText(PROMPT, {}, { timeout: 4000 });

    await logIn();

    expect(screen.queryByText('Welcome to Windows 98')).not.toBeInTheDocument();
  });

  it('shuts down when a shutdown event is dispatched from the desktop', async () => {
    window.localStorage.setItem(
      'win98-prefs-v1',
      JSON.stringify({ system: { hasBooted: true, showWelcome: false } }),
    );
    render(<Home />);
    await screen.findByText(PROMPT, {}, { timeout: 4000 });
    await logIn();

    act(() => {
      window.dispatchEvent(new Event('win98-shutdown'));
    });

    expect(
      screen.getByText("It's now safe to turn off your computer."),
    ).toBeInTheDocument();
  });
});
