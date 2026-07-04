import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { getClipboard, __resetClipboard } from '@/lib/clipboard';
import Excel from '../Excel';

beforeEach(() => {
  __resetClipboard();
});

describe('Excel', () => {
  it('renders the real menu bar with every top-level menu', () => {
    renderWithProviders(<Excel windowId="x1" />);
    const bar = within(screen.getByRole('menubar'));
    for (const label of ['File', 'Edit', 'Insert', 'Format', 'Data', 'Help']) {
      expect(bar.getByRole('menuitem', { name: label })).toBeTruthy();
    }
  });

  it('inserts a floating chart object from the selection via Insert > Chart', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Excel windowId="x2" />);

    await user.click(within(screen.getByRole('menubar')).getByRole('menuitem', { name: 'Insert' }));
    await user.click(await screen.findByRole('menuitem', { name: /Chart\.\.\./ }));
    await user.click(await screen.findByRole('menuitem', { name: /Bar Chart/ }));

    expect(screen.getByText('Chart 1')).toBeInTheDocument();
  }, 15000);

  it('copies the selected cell to the shared clipboard as text', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Excel windowId="x3" />);

    const a1 = document.querySelectorAll('.cursor-cell')[0];
    fireEvent.doubleClick(a1);
    const input = a1.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(a1);

    await user.click(within(screen.getByRole('menubar')).getByRole('menuitem', { name: 'Edit' }));
    await user.click(await screen.findByRole('menuitem', { name: /Copy/ }));

    expect(getClipboard()).toEqual({ kind: 'text', text: 'hello' });
  }, 15000);
});
