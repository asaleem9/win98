import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import PowerPoint from '../PowerPoint';

describe('PowerPoint', () => {
  it('renders the real menu bar with every top-level menu', () => {
    renderWithProviders(<PowerPoint windowId="p1" />);
    const bar = within(screen.getByRole('menubar'));
    for (const label of ['File', 'Edit', 'View', 'Insert', 'Format', 'Help']) {
      expect(bar.getByRole('menuitem', { name: label })).toBeTruthy();
    }
  });

  it('reorders slides by dragging thumbnails in Slide Sorter view', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PowerPoint windowId="p2" />);

    // Add a second, distinctly-titled slide, then switch to the sorter.
    await user.click(screen.getByTitle('New Slide'));
    await user.click(within(screen.getByRole('menubar')).getByRole('menuitem', { name: 'View' }));
    // The accessible name collapses the space around the '&' accelerator (Slide &Sorter).
    await user.click(await screen.findByRole('menuitemradio', { name: /Slide\s*Sorter/ }));

    const thumbs = document.querySelectorAll('[data-sorter-thumb]');
    expect(thumbs).toHaveLength(2);
    expect(thumbs[0].textContent).toContain('Welcome to Windows 98');

    fireEvent.dragStart(thumbs[1]);
    fireEvent.drop(thumbs[0]);

    const after = document.querySelectorAll('[data-sorter-thumb]');
    expect(after[0].textContent).toContain('New Slide');
  });

  it('starts the slide show from the toolbar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PowerPoint windowId="p3" />);
    await user.click(screen.getByTitle('Slide Show (F5)'));
    expect(screen.getByText(/click or → to advance/)).toBeInTheDocument();
  });
});
