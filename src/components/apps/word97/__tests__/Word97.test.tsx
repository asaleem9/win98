import { screen, fireEvent, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import Word97 from '../Word97';

describe('Word97', () => {
  it('renders the editor and formatting toolbar', () => {
    renderWithProviders(<Word97 windowId="w-1" />);
    expect(screen.getByRole('textbox', { name: 'Document' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument();
  });

  it('routes formatting buttons through execCommand', async () => {
    const exec = vi.fn().mockReturnValue(true);
    (document as unknown as { execCommand: typeof exec }).execCommand = exec;
    const user = userEvent.setup();
    renderWithProviders(<Word97 windowId="w-2" />);
    await user.click(screen.getByRole('button', { name: 'B' }));
    expect(exec).toHaveBeenCalledWith('bold', false, undefined);
  });

  it('keeps the crash-on-first-save gag', async () => {
    const bsod = vi.fn();
    window.addEventListener('win98-bsod', bsod);
    const user = userEvent.setup();
    renderWithProviders(<Word97 windowId="w-3" />);
    await user.click(screen.getByRole('menuitem', { name: 'File' }));
    await user.click(screen.getByRole('menuitem', { name: /SaveCtrl\+S/ }));
    expect(bsod).toHaveBeenCalled();
    window.removeEventListener('win98-bsod', bsod);
  });

  it('reports document statistics in the Word Count dialog', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Word97 windowId="w-4" />);
    const editor = screen.getByRole('textbox', { name: 'Document' });
    editor.textContent = 'The cat sat on the mat';
    await user.click(screen.getByRole('menuitem', { name: 'Tools' }));
    await user.click(screen.getByRole('menuitem', { name: /Word Count/ }));
    const wordsRow = (await screen.findByText('Words')).closest('tr') as HTMLElement;
    expect(within(wordsRow).getByText('6')).toBeInTheDocument();
  });

  it('walks and corrects misspellings from the Spelling dialog', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Word97 windowId="w-5" />);
    const editor = screen.getByRole('textbox', { name: 'Document' });
    editor.textContent = 'I recieve teh news';

    await user.click(screen.getByRole('menuitem', { name: 'Tools' }));
    await user.click(screen.getByRole('menuitem', { name: /Spelling and Grammar/ }));

    // First misspelling surfaced with its suggestion pre-selected.
    expect(screen.getByText('Not in Dictionary:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('receive')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Change' }));
    // Now on the second misspelling.
    expect(screen.getByDisplayValue('the')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Change' }));

    expect(await screen.findByText(/spelling and grammar check is complete/i)).toBeInTheDocument();
    expect(editor.textContent).toBe('I receive the news');
  });

  it('opens a document passed via launch params', () => {
    renderWithProviders(
      <Word97 windowId="w-6" launchParams={{ filePath: 'C:\\My Documents\\letter.doc' }} launchCount={1} />,
    );
    const editor = screen.getByRole('textbox', { name: 'Document' });
    expect(editor.textContent).toContain('Dear Sir/Madam');
  });

  it('offers letter help through the Office Assistant when text starts with Dear', async () => {
    vi.useFakeTimers();
    try {
      renderWithProviders(<Word97 windowId="w-7" />);
      const editor = screen.getByRole('textbox', { name: 'Document' });
      editor.textContent = 'Dear Mr. Gates';
      fireEvent.input(editor);
      act(() => { vi.advanceTimersByTime(900); });
      expect(screen.getByText(/writing a letter/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the About dialog', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Word97 windowId="w-8" />);
    await user.click(screen.getByRole('menuitem', { name: 'Help' }));
    await user.click(screen.getByRole('menuitem', { name: /About Microsoft Word/ }));
    expect(await screen.findByText('Microsoft Word 97')).toBeInTheDocument();
  });
});
