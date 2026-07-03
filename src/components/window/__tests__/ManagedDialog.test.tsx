import { cleanup, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import { useWindows } from '@/contexts/WindowContext';
import { ManagedDialog } from '../ManagedDialog';

afterEach(() => {
  cleanup();
});

function OwnedProbe() {
  const { windows } = useWindows();
  const owned = windows.filter((w) => w.ownerId === 'owner-x');
  return <div data-testid="owned">{owned.map((w) => w.id).join(',')}</div>;
}

function Harness({ open }: { open: boolean }) {
  return (
    <>
      <OwnedProbe />
      {open && (
        <ManagedDialog ownerId="owner-x" title="My Dialog" width={300} height={200} onClose={() => {}}>
          <div>Dialog body</div>
        </ManagedDialog>
      )}
    </>
  );
}

describe('ManagedDialog', () => {
  it('registers a managed owned window and renders its chrome while mounted', async () => {
    renderWithProviders(<Harness open={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('owned').textContent).not.toBe('');
    });
    expect(screen.getByText('My Dialog')).toBeInTheDocument();
    expect(screen.getByText('Dialog body')).toBeInTheDocument();
  });

  it('closes the managed window when unmounted', async () => {
    const { rerender } = renderWithProviders(<Harness open={true} />);
    await waitFor(() => {
      expect(screen.getByTestId('owned').textContent).not.toBe('');
    });

    rerender(<Harness open={false} />);
    await waitFor(() => {
      expect(screen.getByTestId('owned').textContent).toBe('');
    });
    expect(screen.queryByText('My Dialog')).not.toBeInTheDocument();
  });
});
