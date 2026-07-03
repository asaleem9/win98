import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import VisualBasic6 from '../VisualBasic6';

describe('VisualBasic6', () => {
  it('mounts without throwing', () => {
    renderWithProviders(<VisualBasic6 windowId="w1" />);
    expect(screen.getByTitle('Run (F5)')).toBeInTheDocument();
  });

  it('shows the compile error gag when running an empty form', () => {
    renderWithProviders(<VisualBasic6 windowId="w1" />);
    fireEvent.click(screen.getByTitle('Run (F5)'));
    expect(screen.getByText('Compile error:')).toBeInTheDocument();
  });

  it('creates a control by selecting a toolbox tool and clicking the form canvas', () => {
    renderWithProviders(<VisualBasic6 windowId="w1" />);
    fireEvent.click(screen.getByTitle('CommandButton'));
    // the form window's grid canvas is the only element with the dotted background style
    const canvas = document.querySelector('.relative[style*="320px"]') as HTMLElement;
    expect(canvas).toBeTruthy();
    fireEvent.click(canvas, { clientX: 50, clientY: 50 });
    expect(screen.getAllByText('Command1').length).toBeGreaterThan(0);
  });

  it('runs a non-empty form and lets a command button be clicked', () => {
    renderWithProviders(<VisualBasic6 windowId="w1" />);
    fireEvent.click(screen.getByTitle('CommandButton'));
    const canvas = document.querySelector('.relative[style*="320px"]') as HTMLElement;
    fireEvent.click(canvas, { clientX: 50, clientY: 50 });
    fireEvent.click(screen.getByTitle('Run (F5)'));
    fireEvent.click(screen.getByRole('button', { name: 'Command1' }));
    expect(screen.getByText(/clicked 1 time/)).toBeInTheDocument();
  });
});
