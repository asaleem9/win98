import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import DxDiag from '../DxDiag';
import { DX_VERSION, TEST_DURATION_MS } from '../dxLogic';

describe('DxDiag tabs', () => {
  it('opens on the System tab showing the DirectX version', () => {
    renderWithProviders(<DxDiag windowId="w1" />);
    expect(screen.getByText('DirectX Version')).toBeInTheDocument();
    expect(screen.getAllByText(DX_VERSION).length).toBeGreaterThan(0);
  });

  it('switches to each tab', () => {
    renderWithProviders(<DxDiag windowId="w1" />);
    fireEvent.click(screen.getByText('DirectX Files'));
    expect(screen.getByText('ddraw.dll')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Display'));
    expect(screen.getByText('Test DirectDraw')).toBeInTheDocument();
    expect(screen.getByText('Test Direct3D')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Sound'));
    expect(screen.getByText('Test DirectSound')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Input'));
    expect(screen.getByText('DirectInput Devices')).toBeInTheDocument();
  });

  it('shows "No problems found." on the Display tab before any test', () => {
    renderWithProviders(<DxDiag windowId="w1" />);
    fireEvent.click(screen.getByText('Display'));
    expect(screen.getByText('No problems found.')).toBeInTheDocument();
  });
});

describe('DxDiag test sequence', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs the DirectDraw test to the pass/fail prompt and records a failure', () => {
    renderWithProviders(<DxDiag windowId="w1" />);
    fireEvent.click(screen.getByText('Display'));
    fireEvent.click(screen.getByText('Test DirectDraw'));

    // The animation overlay is up first...
    expect(screen.getByText('Testing DirectDraw...')).toBeInTheDocument();

    // ...then after the fixed duration the prompt appears.
    act(() => {
      vi.advanceTimersByTime(TEST_DURATION_MS);
    });
    expect(screen.getByText(/Did the test pass/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('No'));
    expect(screen.getByText(/reported a failure/)).toBeInTheDocument();
  });

  it('keeps a clean bill of health when the test passes', () => {
    renderWithProviders(<DxDiag windowId="w1" />);
    fireEvent.click(screen.getByText('Sound'));
    fireEvent.click(screen.getByText('Test DirectSound'));
    act(() => {
      vi.advanceTimersByTime(TEST_DURATION_MS);
    });
    fireEvent.click(screen.getByText('Yes'));
    expect(screen.getByText('No problems found.')).toBeInTheDocument();
  });
});
