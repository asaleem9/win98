import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { LoginScreen } from '../LoginScreen';

function savedName(): string | undefined {
  const raw = window.localStorage.getItem('win98-prefs-v1');
  if (!raw) return undefined;
  return (JSON.parse(raw) as { system?: { userName?: string } }).system?.userName;
}

describe('LoginScreen', () => {
  it('renders the authentic logon prompt', () => {
    renderWithProviders(<LoginScreen onLogin={() => {}} />);
    expect(
      screen.getByText('Type a user name and password to log on to Windows.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('prefills the saved user name for returning users', () => {
    window.localStorage.setItem(
      'win98-prefs-v1',
      JSON.stringify({ system: { userName: 'Bob' } }),
    );
    renderWithProviders(<LoginScreen onLogin={() => {}} />);
    expect(screen.getByLabelText('User name')).toHaveValue('Bob');
  });

  it('OK saves the typed name and logs in', () => {
    const onLogin = vi.fn();
    renderWithProviders(<LoginScreen onLogin={onLogin} />);
    fireEvent.change(screen.getByLabelText('User name'), { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(savedName()).toBe('Alice');
  });

  it('OK with a blank name defaults to "User"', () => {
    const onLogin = vi.fn();
    renderWithProviders(<LoginScreen onLogin={onLogin} />);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onLogin).toHaveBeenCalled();
    expect(savedName()).toBe('User');
  });

  it('Cancel logs in without clobbering an existing name', () => {
    window.localStorage.setItem(
      'win98-prefs-v1',
      JSON.stringify({ system: { userName: 'Bob' } }),
    );
    const onLogin = vi.fn();
    renderWithProviders(<LoginScreen onLogin={onLogin} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(savedName()).toBe('Bob');
  });

  it('Esc logs in the same way as Cancel', () => {
    const onLogin = vi.fn();
    renderWithProviders(<LoginScreen onLogin={onLogin} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onLogin).toHaveBeenCalledTimes(1);
    // No name was typed and none was saved, so nothing is written.
    expect(savedName()).toBeUndefined();
  });
});
