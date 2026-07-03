import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import Notepad from '../Notepad';

describe('Notepad', () => {
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
});
