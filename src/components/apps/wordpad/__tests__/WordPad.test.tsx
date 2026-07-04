import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import WordPad from '../WordPad';

describe('WordPad', () => {
  it('renders an editable area with a ruler', () => {
    renderWithProviders(<WordPad windowId="wp-1" />);
    expect(screen.getByRole('textbox', { name: 'Document' })).toBeInTheDocument();
    expect(screen.getByTestId('wordpad-ruler')).toBeInTheDocument();
  });

  it('hides and shows chrome from the View menu', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WordPad windowId="wp-2" />);
    expect(screen.getByTestId('wordpad-ruler')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'View' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Ruler/ }));
    expect(screen.queryByTestId('wordpad-ruler')).not.toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'View' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Ruler/ }));
    expect(screen.getByTestId('wordpad-ruler')).toBeInTheDocument();
  });

  it('persists a hidden status bar across remounts via app prefs', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<WordPad windowId="wp-3" />);
    await user.click(screen.getByRole('menuitem', { name: 'View' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Status Bar/ }));
    expect(screen.queryByTestId('wordpad-status-bar')).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<WordPad windowId="wp-3b" />);
    expect(screen.queryByTestId('wordpad-status-bar')).not.toBeInTheDocument();
  });

  it('renders a plain-text document passed via launch params', () => {
    renderWithProviders(
      <WordPad windowId="wp-4" launchParams={{ filePath: 'C:\\My Documents\\letter.doc' }} launchCount={1} />,
    );
    const editor = screen.getByRole('textbox', { name: 'Document' });
    expect(editor.textContent).toContain('Dear Sir/Madam');
  });

  it('saves a document and reopens it (round trip)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WordPad windowId="wp-5" />);
    const editor = screen.getByRole('textbox', { name: 'Document' });
    editor.innerHTML = '<b>Round trip</b>';

    // Save As -> accept the default name (Document.rtf) in My Documents.
    await user.click(screen.getByRole('menuitem', { name: 'File' }));
    await user.click(screen.getByRole('menuitem', { name: /SaveAs/ }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    // Clear the editor.
    await user.click(screen.getByRole('menuitem', { name: 'File' }));
    await user.click(screen.getByRole('menuitem', { name: /New/ }));
    expect(editor.innerHTML).toBe('');

    // Reopen the saved file.
    await user.click(screen.getByRole('menuitem', { name: 'File' }));
    await user.click(screen.getByRole('menuitem', { name: /Open/ }));
    await user.dblClick(await screen.findByText('Document.rtf'));

    expect(editor.textContent).toContain('Round trip');
  });
});
