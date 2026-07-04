import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { setClipboard, __resetClipboard } from '@/lib/clipboard';
import Notepad from '../Notepad';

describe('Notepad', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetClipboard();
  });

  it('renders an editable text area', () => {
    renderWithProviders(<Notepad windowId="np-1" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('updates the character/line count as you type', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Notepad windowId="np-2" />);
    await user.type(screen.getByRole('textbox'), 'hello');
    expect(await screen.findByText(/5 chars, 1 lines/)).toBeInTheDocument();
  });

  it('tracks line and column position', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Notepad windowId="np-3" />);
    await user.type(screen.getByRole('textbox'), 'ab{Enter}c');
    expect(await screen.findByText(/Ln 2, Col 2/)).toBeInTheDocument();
  });

  it('prompts to save changes when starting a New file while dirty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Notepad windowId="np-4" />);
    await user.type(screen.getByRole('textbox'), 'unsaved work');

    await user.click(screen.getByRole('menuitem', { name: 'File' }));
    await user.click(screen.getByRole('menuitem', { name: /New/ }));

    expect(await screen.findByText(/has changed/)).toBeInTheDocument();
  });

  it('discards changes on New when choosing No', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Notepad windowId="np-5" />);
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
    await user.type(ta, 'temp');

    await user.click(screen.getByRole('menuitem', { name: 'File' }));
    await user.click(screen.getByRole('menuitem', { name: /New/ }));
    await user.click(await screen.findByRole('button', { name: 'No' }));

    await waitFor(() => expect(ta.value).toBe(''));
  });

  it('shows an About dialog', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Notepad windowId="np-6" />);
    await user.click(screen.getByRole('menuitem', { name: 'Help' }));
    await user.click(screen.getByRole('menuitem', { name: 'About Notepad' }));
    expect(await screen.findByText(/Version 4\.10\.1998/)).toBeInTheDocument();
  });

  it('applies a chosen font and persists it across remounts', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<Notepad windowId="w1" />);

    await user.click(screen.getByRole('menuitem', { name: 'Format' }));
    await user.click(screen.getByRole('menuitem', { name: /Font/ }));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Font' }), 'Courier New');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Size' }), '16');
    await user.click(screen.getByRole('button', { name: 'OK' }));

    const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(ta.style.fontFamily).toContain('Courier New');
    expect(ta.style.fontSize).toBe('16px');

    // Remount from a clean tree — the pref should be restored from localStorage.
    unmount();
    renderWithProviders(<Notepad windowId="w1" />);
    const restored = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(restored.style.fontFamily).toContain('Courier New');
    expect(restored.style.fontSize).toBe('16px');
  });

  it('enables Edit > Paste only while the shared clipboard holds text', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Notepad windowId="w1" />);

    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(screen.getByRole('menuitem', { name: /Paste/ })).toBeDisabled();

    act(() => setClipboard({ kind: 'text', text: 'clip' }));
    expect(screen.getByRole('menuitem', { name: /Paste/ })).not.toBeDisabled();

    act(() => setClipboard({ kind: 'image', dataUrl: 'data:image/png;base64,x' }));
    expect(screen.getByRole('menuitem', { name: /Paste/ })).toBeDisabled();
  });
});
