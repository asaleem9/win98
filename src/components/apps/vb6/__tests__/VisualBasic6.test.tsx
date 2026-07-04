import { screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import VisualBasic6 from '../VisualBasic6';

describe('VisualBasic6', () => {
  it('mounts without throwing', () => {
    renderWithProviders(<VisualBasic6 windowId="w1" />);
    expect(screen.getByTitle('Start (F5)')).toBeInTheDocument();
  });

  it('renders the real menu bar with every top-level menu', () => {
    renderWithProviders(<VisualBasic6 windowId="w1" />);
    const bar = within(screen.getByRole('menubar'));
    for (const label of ['File', 'Edit', 'View', 'Project', 'Format', 'Run', 'Help']) {
      expect(bar.getByRole('menuitem', { name: label })).toBeTruthy();
    }
  });

  it('shows the compile error gag when running an empty form', () => {
    renderWithProviders(<VisualBasic6 windowId="w1" />);
    fireEvent.click(screen.getByTitle('Start (F5)'));
    expect(screen.getByText('Compile error:')).toBeInTheDocument();
  });

  it('creates a control by selecting a toolbox tool and clicking the form canvas', () => {
    renderWithProviders(<VisualBasic6 windowId="w1" />);
    fireEvent.click(screen.getByTitle('CommandButton'));
    const canvas = document.querySelector('[data-vb6-canvas]') as HTMLElement;
    expect(canvas).toBeTruthy();
    fireEvent.click(canvas, { clientX: 50, clientY: 50 });
    expect(screen.getAllByText('Command1').length).toBeGreaterThan(0);
  });

  it('runs a non-empty form and lets a command button be clicked', () => {
    renderWithProviders(<VisualBasic6 windowId="w1" />);
    fireEvent.click(screen.getByTitle('CommandButton'));
    const canvas = document.querySelector('[data-vb6-canvas]') as HTMLElement;
    fireEvent.click(canvas, { clientX: 50, clientY: 50 });
    fireEvent.click(screen.getByTitle('Start (F5)'));
    fireEvent.click(screen.getByRole('button', { name: 'Command1' }));
    expect(screen.getByText(/clicked 1 time/)).toBeInTheDocument();
  });

  it('toggles Break/End availability across run and break states', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VisualBasic6 windowId="w1" />);

    fireEvent.click(screen.getByTitle('CommandButton'));
    const canvas = document.querySelector('[data-vb6-canvas]') as HTMLElement;
    fireEvent.click(canvas, { clientX: 40, clientY: 40 });

    const startBtn = screen.getByTitle('Start (F5)');
    const breakBtn = screen.getByTitle('Break');
    const endBtn = screen.getByTitle('End');
    expect(breakBtn).toBeDisabled();
    expect(endBtn).toBeDisabled();

    await user.click(startBtn);
    expect(startBtn).toBeDisabled();
    expect(breakBtn).not.toBeDisabled();
    expect(endBtn).not.toBeDisabled();

    await user.click(breakBtn);
    expect(screen.getByText(/\[break\]/)).toBeInTheDocument();

    await user.click(endBtn);
    expect(startBtn).not.toBeDisabled();
  }, 15000);
});
