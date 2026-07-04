import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { getClipboard, setClipboard, __resetClipboard } from '@/lib/clipboard';
import Explorer from '@/components/apps/explorer/Explorer';

beforeEach(() => {
  // Each test starts from the seeded virtual filesystem, not a persisted one.
  window.localStorage.clear();
  __resetClipboard();
});

describe('Explorer navigation', () => {
  it('lists the contents of C:\\ on open', () => {
    renderWithProviders(<Explorer windowId="w1" launchCount={1} />);
    // Top-level files only appear in the list pane (not the folder tree).
    expect(screen.getByText('AUTOEXEC.BAT')).toBeInTheDocument();
    expect(screen.getByText('CONFIG.SYS')).toBeInTheDocument();
  });

  it('navigates into a folder on double-click', () => {
    renderWithProviders(<Explorer windowId="w1" launchCount={1} />);
    // 'Program Files' shows in both the tree and the list; the list cell is last.
    const target = screen.getAllByText('Program Files').at(-1)!;
    fireEvent.doubleClick(target);
    // These children only exist inside C:\Program Files.
    expect(screen.getByText('Internet Explorer')).toBeInTheDocument();
    expect(screen.getByText('Windows Media Player')).toBeInTheDocument();
    // The top-level-only file is gone from the list.
    expect(screen.queryByText('AUTOEXEC.BAT')).not.toBeInTheDocument();
  });

  it('honors launchParams.filePath as the starting directory', () => {
    renderWithProviders(
      <Explorer windowId="w1" launchParams={{ filePath: 'C:\\Windows' }} launchCount={1} />,
    );
    expect(screen.getByText('NOTEPAD.EXE')).toBeInTheDocument();
    expect(screen.getByText('EXPLORER.EXE')).toBeInTheDocument();
    // A C:\ root file should not be listed here.
    expect(screen.queryByText('AUTOEXEC.BAT')).not.toBeInTheDocument();
  });

  it('creates a new folder from the File menu', () => {
    renderWithProviders(<Explorer windowId="w1" launchParams={{ filePath: 'C:\\TEMP' }} launchCount={1} />);
    fireEvent.mouseDown(screen.getByText('File'));
    fireEvent.click(screen.getByText('New Folder'));
    expect(screen.getByText('New Folder')).toBeInTheDocument();
  });

  it('navigates via the address bar on Enter', () => {
    renderWithProviders(<Explorer windowId="w1" launchCount={1} />);
    const address = screen.getByDisplayValue('C:\\') as HTMLInputElement;
    fireEvent.change(address, { target: { value: 'C:\\Windows\\Fonts' } });
    fireEvent.keyDown(address, { key: 'Enter' });
    expect(screen.getByText('ARIAL.TTF')).toBeInTheDocument();
  });
});

describe('Explorer shared clipboard', () => {
  it('copies the selected file to the shared clipboard', () => {
    renderWithProviders(<Explorer windowId="w1" launchCount={1} />);
    fireEvent.click(screen.getByText('AUTOEXEC.BAT'));
    fireEvent.mouseDown(screen.getByText('Edit'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Copy/ }));
    expect(getClipboard()).toEqual({ kind: 'files', operation: 'copy', paths: ['C:\\AUTOEXEC.BAT'] });
  });

  it('cuts the selected file and ghosts its row', () => {
    renderWithProviders(<Explorer windowId="w1" launchCount={1} />);
    fireEvent.click(screen.getByText('AUTOEXEC.BAT'));
    fireEvent.mouseDown(screen.getByText('Edit'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Cut/ }));
    expect(getClipboard()).toEqual({ kind: 'files', operation: 'cut', paths: ['C:\\AUTOEXEC.BAT'] });
    // Cut items dim until pasted.
    expect(screen.getByText('AUTOEXEC.BAT').closest('[data-ghost]')).not.toBeNull();
  });

  it('pastes a copied file into another folder without removing the original', () => {
    renderWithProviders(<Explorer windowId="w1" launchCount={1} />);
    fireEvent.click(screen.getByText('AUTOEXEC.BAT'));
    fireEvent.mouseDown(screen.getByText('Edit'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Copy/ }));

    const address = screen.getByDisplayValue('C:\\') as HTMLInputElement;
    fireEvent.change(address, { target: { value: 'C:\\TEMP' } });
    fireEvent.keyDown(address, { key: 'Enter' });
    expect(screen.queryByText('AUTOEXEC.BAT')).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByText('Edit'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Paste/ }));
    expect(screen.getByText('AUTOEXEC.BAT')).toBeInTheDocument();

    // Copy leaves the source untouched.
    fireEvent.change(address, { target: { value: 'C:\\' } });
    fireEvent.keyDown(address, { key: 'Enter' });
    expect(screen.getByText('AUTOEXEC.BAT')).toBeInTheDocument();
  });

  it('moves a cut file on paste and clears the clipboard', () => {
    renderWithProviders(<Explorer windowId="w1" launchCount={1} />);
    fireEvent.click(screen.getByText('AUTOEXEC.BAT'));
    fireEvent.mouseDown(screen.getByText('Edit'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Cut/ }));
    expect(screen.getByText('AUTOEXEC.BAT').closest('[data-ghost]')).not.toBeNull();

    const address = screen.getByDisplayValue('C:\\') as HTMLInputElement;
    fireEvent.change(address, { target: { value: 'C:\\TEMP' } });
    fireEvent.keyDown(address, { key: 'Enter' });

    fireEvent.mouseDown(screen.getByText('Edit'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Paste/ }));

    // Landed in TEMP, and the cut cleared so nothing stays ghosted.
    expect(screen.getByText('AUTOEXEC.BAT')).toBeInTheDocument();
    expect(getClipboard()).toBeNull();
    expect(screen.getByText('AUTOEXEC.BAT').closest('[data-ghost]')).toBeNull();

    // Gone from the original folder.
    fireEvent.change(address, { target: { value: 'C:\\' } });
    fireEvent.keyDown(address, { key: 'Enter' });
    expect(screen.queryByText('AUTOEXEC.BAT')).not.toBeInTheDocument();
  });

  it('disables Edit > Paste when the shared clipboard is empty', () => {
    renderWithProviders(<Explorer windowId="w1" launchCount={1} />);
    fireEvent.mouseDown(screen.getByText('Edit'));
    expect(screen.getByRole('menuitem', { name: /Paste/ })).toBeDisabled();
  });

  it('disables Edit > Paste for a non-files clipboard kind', () => {
    setClipboard({ kind: 'text', text: 'hello' });
    renderWithProviders(<Explorer windowId="w1" launchCount={1} />);
    fireEvent.mouseDown(screen.getByText('Edit'));
    expect(screen.getByRole('menuitem', { name: /Paste/ })).toBeDisabled();
  });

  it('enables Edit > Paste when the shared clipboard holds files', () => {
    setClipboard({ kind: 'files', paths: ['C:\\AUTOEXEC.BAT'], operation: 'copy' });
    renderWithProviders(<Explorer windowId="w1" launchCount={1} />);
    fireEvent.mouseDown(screen.getByText('Edit'));
    expect(screen.getByRole('menuitem', { name: /Paste/ })).toBeEnabled();
  });
});
