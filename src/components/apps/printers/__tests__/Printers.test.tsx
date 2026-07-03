import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import Printers from '../Printers';
import { submitPrintJob, __resetPrintService } from '@/lib/print/printService';

afterEach(() => {
  cleanup();
  __resetPrintService();
});

describe('Printers', () => {
  it('lists the installed printers and the Add Printer item', () => {
    renderWithProviders(<Printers windowId="pr-1" />);
    expect(screen.getByText('Add Printer')).toBeInTheDocument();
    expect(screen.getByText('HP LaserJet 4L')).toBeInTheDocument();
    expect(screen.getByText('Epson Stylus COLOR 600')).toBeInTheDocument();
    expect(screen.getByText('Microsoft Fax')).toBeInTheDocument();
  });

  it('runs the Add Printer wizard to its pretend-it-exists ending', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Printers windowId="pr-2" />);
    await user.dblClick(screen.getByText('Add Printer'));

    await user.click(await screen.findByRole('button', { name: /Next/ }));
    await user.click(await screen.findByRole('button', { name: /Next/ }));
    await user.click(await screen.findByRole('button', { name: /Finish/ }));

    expect(await screen.findByText(/Windows will pretend it exists/)).toBeInTheDocument();
  });

  it('opens a printer queue and reflects a submitted job', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Printers windowId="pr-3" />);
    await user.dblClick(screen.getByText('HP LaserJet 4L'));

    submitPrintJob({
      appName: 'Notepad',
      documentName: 'Report.txt',
      content: { kind: 'text', text: 'hello' },
      printerId: 'hp-laserjet-4l',
    });

    expect(await screen.findByText('Report.txt')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Printer/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Document/ })).toBeInTheDocument();
  });
});
