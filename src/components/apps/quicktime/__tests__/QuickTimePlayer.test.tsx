import { screen, fireEvent, act } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import QuickTimePlayer from '../QuickTimePlayer';

describe('QuickTimePlayer', () => {
  it('renders the player with a timeline', () => {
    renderWithProviders(<QuickTimePlayer windowId="w1" />);
    expect(screen.getByLabelText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('QuickTime Player')).toBeInTheDocument();
  });

  it('exposes File, Movie and Help menus', () => {
    renderWithProviders(<QuickTimePlayer windowId="w1" />);
    expect(screen.getByRole('menuitem', { name: 'File' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Movie' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Help' })).toBeInTheDocument();
  });

  it('plays the free sample on first play, nags with the Pro upsell on the second', () => {
    renderWithProviders(<QuickTimePlayer windowId="w1" />);
    const play = screen.getByText('▶');
    act(() => { fireEvent.click(play); });
    // Now playing -> pause icon present, no nag yet
    expect(screen.queryByText('QuickTime Pro Required')).not.toBeInTheDocument();
    act(() => { fireEvent.click(screen.getByText('⏸')); }); // pause
    act(() => { fireEvent.click(screen.getByText('▶')); }); // second play -> nag
    expect(screen.getByText('QuickTime Pro Required')).toBeInTheDocument();
  });

  it('resizes the movie canvas from the Movie > size options', () => {
    const { container } = renderWithProviders(<QuickTimePlayer windowId="w1" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    const normalW = canvas.width;
    const normalH = canvas.height;

    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Movie' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Double Size/ }));
    expect(canvas.width).toBe(normalW * 2);
    expect(canvas.height).toBe(normalH * 2);

    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Movie' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Half Size/ }));
    expect(canvas.width).toBe(Math.round(normalW / 2));

    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Movie' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: /Normal Size/ }));
    expect(canvas.width).toBe(normalW);
  });

  it('toggles the Loop option checked state', () => {
    renderWithProviders(<QuickTimePlayer windowId="w1" />);
    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Movie' }));
    // Loop is on by default.
    expect(screen.getByRole('menuitemcheckbox', { name: /Loop/ })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /Loop/ }));

    fireEvent.mouseDown(screen.getByRole('menuitem', { name: 'Movie' }));
    expect(screen.getByRole('menuitemcheckbox', { name: /Loop/ })).toHaveAttribute('aria-checked', 'false');
  });
});
