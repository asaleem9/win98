import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import MouseProperties from '../MouseProperties';

describe('MouseProperties', () => {
  it('double-clicking the test box within the window pops the jack', () => {
    renderWithProviders(<MouseProperties windowId="w1" />);
    const box = screen.getByRole('button', { name: 'Double-click test area' });
    // Two clicks in the same tick fall inside the default 500ms window.
    act(() => {
      fireEvent.click(box);
      fireEvent.click(box);
    });
    expect(screen.getByText('Boing!')).toBeInTheDocument();
  });

  it('moving the double-click slider to Fast persists the smallest window', () => {
    renderWithProviders(<MouseProperties windowId="w1" />);
    act(() => {
      fireEvent.change(screen.getByLabelText('Double-click speed'), { target: { value: '10' } });
    });
    const prefs = JSON.parse(window.localStorage.getItem('win98-prefs-v1')!);
    expect(prefs.mouse.doubleClickSpeed).toBe(200);
  });

  it('toggling "Show pointer trails" on the Motion tab persists the pref', () => {
    renderWithProviders(<MouseProperties windowId="w1" />);
    fireEvent.click(screen.getByText('Motion'));
    act(() => {
      fireEvent.click(screen.getByLabelText('Show pointer trails'));
    });
    const prefs = JSON.parse(window.localStorage.getItem('win98-prefs-v1')!);
    expect(prefs.mouse.trails).toBe(true);
  });

  it('adjusts trail length once trails are enabled', () => {
    renderWithProviders(<MouseProperties windowId="w1" />);
    fireEvent.click(screen.getByText('Motion'));
    act(() => {
      fireEvent.click(screen.getByLabelText('Show pointer trails'));
    });
    act(() => {
      fireEvent.change(screen.getByLabelText('Pointer trail length'), { target: { value: '8' } });
    });
    const prefs = JSON.parse(window.localStorage.getItem('win98-prefs-v1')!);
    expect(prefs.mouse.trailLength).toBe(8);
  });
});
