import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { PrintDialog } from '../PrintDialog';
import type { PrintContent } from '@/lib/print/types';

afterEach(() => cleanup());

function renderDialog(getContent: () => PrintContent | null = () => ({ kind: 'text', text: 'hi' })) {
  return renderWithProviders(
    <PrintDialog
      ownerId="owner-1"
      appName="Notepad"
      documentName="Doc.txt"
      getContent={getContent}
      onClose={() => {}}
    />,
  );
}

describe('PrintDialog', () => {
  it('renders the Print dialog with all installed printers', async () => {
    renderDialog();
    expect(await screen.findByText('Print')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'HP LaserJet 4L' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Epson Stylus COLOR 600' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Microsoft Fax' })).toBeInTheDocument();
  });

  it('shows the selected printer port', async () => {
    renderDialog();
    expect(await screen.findByText('LPT1:')).toBeInTheDocument();
  });

  it('validates the page range and disables OK when invalid', async () => {
    const user = userEvent.setup();
    renderDialog();

    const ok = await screen.findByRole('button', { name: 'OK' });
    expect(ok).toBeEnabled();

    await user.click(screen.getByLabelText('Pages'));
    const from = screen.getByLabelText('From page');
    const to = screen.getByLabelText('To page');
    await user.clear(from);
    await user.type(from, '5');
    await user.clear(to);
    await user.type(to, '2');

    expect(await screen.findByText(/not a valid page range/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OK' })).toBeDisabled();
  });
});
