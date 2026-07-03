import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import Explorer from '@/components/apps/explorer/Explorer';

beforeEach(() => {
  // Each test starts from the seeded virtual filesystem, not a persisted one.
  window.localStorage.clear();
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
