import { render, screen } from '@testing-library/react';
import { MobileGate } from '../MobileGate';

describe('MobileGate', () => {
  it('renders the desktop-only message (CSS decides when it shows)', () => {
    render(<MobileGate />);
    const gate = screen.getByRole('dialog', { name: /desktop computer required/i });
    expect(gate).toHaveClass('mobile-gate');
    expect(screen.getByText(/requires a desktop computer/i)).toBeInTheDocument();
    expect(screen.getByText(/mouse and keyboard/i)).toBeInTheDocument();
  });
});
