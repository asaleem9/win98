import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BootSequence } from '../BootSequence';

describe('BootSequence', () => {
  it('runs the BIOS memory count on a full boot', () => {
    render(<BootSequence onComplete={() => {}} />);
    expect(screen.getByText(/Memory Test:/)).toBeInTheDocument();
  });

  it('skips the memory count and flashes the flag on the fast path', async () => {
    render(<BootSequence onComplete={() => {}} fast />);
    // The POST frame may flash once (it keeps server and client markup in
    // agreement); the fast path must land on the flag without counting memory.
    await screen.findByText('Click anywhere to skip');
    expect(screen.queryByText(/Memory Test:/)).not.toBeInTheDocument();
  });

  it('completes the fast path', async () => {
    const onComplete = vi.fn();
    render(<BootSequence onComplete={onComplete} fast />);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), { timeout: 3000 });
  });

  it('click-to-skip fires onComplete immediately', async () => {
    const onComplete = vi.fn();
    render(<BootSequence onComplete={onComplete} fast />);
    fireEvent.click(await screen.findByText('Click anywhere to skip'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
