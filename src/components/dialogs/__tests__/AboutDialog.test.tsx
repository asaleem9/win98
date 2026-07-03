import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { AboutDialog } from '../AboutDialog';

describe('AboutDialog', () => {
  it('renders the Microsoft app heading and the physical memory line', () => {
    renderWithProviders(<AboutDialog appName="Notepad" onClose={() => {}} />);

    expect(screen.getByText('Microsoft Notepad')).toBeInTheDocument();
    expect(screen.getByText('Windows 98')).toBeInTheDocument();
    expect(screen.getByText('This product is licensed to:')).toBeInTheDocument();
    expect(screen.getByText('130,612 KB')).toBeInTheDocument();
  });

  it('shows the persisted user name as the licensee', () => {
    window.localStorage.setItem('win98-prefs-v1', JSON.stringify({ system: { userName: 'Bill Gates' } }));
    renderWithProviders(<AboutDialog appName="Paint" onClose={() => {}} />);
    expect(screen.getByText('Bill Gates')).toBeInTheDocument();
  });

  it('falls back to "User" when no name is stored', () => {
    renderWithProviders(<AboutDialog appName="Paint" onClose={() => {}} />);
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('closes via OK', async () => {
    const onClose = vi.fn();
    renderWithProviders(<AboutDialog appName="Notepad" onClose={onClose} />);
    screen.getByRole('button', { name: 'OK' }).click();
    expect(onClose).toHaveBeenCalled();
  });
});
