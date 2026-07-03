import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { WindowErrorBoundary } from '../WindowErrorBoundary';

function Boom(): never {
  throw new Error('kaboom');
}

describe('WindowErrorBoundary', () => {
  beforeEach(() => {
    // React logs caught errors to console.error; silence the expected noise.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('catches a throwing child and shows the GPF error dialog', () => {
    renderWithProviders(
      <WindowErrorBoundary appName="Notepad" windowId="w1">
        <Boom />
      </WindowErrorBoundary>,
    );
    expect(screen.getByText(/General Protection Fault/)).toBeInTheDocument();
  });

  it('renders children normally when nothing throws', () => {
    renderWithProviders(
      <WindowErrorBoundary appName="Notepad" windowId="w2">
        <div>all good</div>
      </WindowErrorBoundary>,
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('calls onClose when the crash dialog is dismissed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <WindowErrorBoundary appName="Notepad" windowId="w3" onClose={onClose}>
        <Boom />
      </WindowErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
