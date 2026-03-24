import { render, screen } from '@testing-library/react';
import { StatusBar98 } from '@/components/ui/StatusBar98';

const panels = [
  { content: 'Ready' },
  { content: 'Ln 1', width: 80, align: 'right' as const },
  { content: 'Col 1', width: 80, align: 'center' as const },
];

describe('StatusBar98', () => {
  it('renders all panels', () => {
    render(<StatusBar98 panels={panels} />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Ln 1')).toBeInTheDocument();
    expect(screen.getByText('Col 1')).toBeInTheDocument();
  });

  it('first panel has flex-1 (takes remaining space)', () => {
    render(<StatusBar98 panels={panels} />);
    const firstPanel = screen.getByText('Ready').closest('div[class*="border"]') as HTMLElement;
    expect(firstPanel.className).toMatch(/flex-1/);
  });

  it('fixed-width panels have specified width', () => {
    render(<StatusBar98 panels={panels} />);
    const lnPanel = screen.getByText('Ln 1') as HTMLElement;
    expect(lnPanel.style.width).toBe('80px');
  });

  it('inset border styling on panels', () => {
    render(<StatusBar98 panels={panels} />);
    const panel = screen.getByText('Ready') as HTMLElement;
    expect(panel.className).toMatch(/border-t-\[var\(--win98-button-shadow\)\]/);
    expect(panel.className).toMatch(/border-b-\[var\(--win98-button-highlight\)\]/);
  });

  it('text alignment follows panel config', () => {
    render(<StatusBar98 panels={panels} />);
    const rightPanel = screen.getByText('Ln 1') as HTMLElement;
    expect(rightPanel.className).toMatch(/justify-end/);
    const centerPanel = screen.getByText('Col 1') as HTMLElement;
    expect(centerPanel.className).toMatch(/justify-center/);
  });
});
