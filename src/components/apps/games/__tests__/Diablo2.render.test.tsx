import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import Diablo2 from '../Diablo2';

// Drives the in-game path (sprites, skill bar, belt, combat) so the new UI JSX
// is exercised beyond the title screen. Rolls are non-deterministic here; the
// test only asserts the shell renders and interaction never throws.
describe('Diablo2 in-game UI', () => {
  it('starts a hero, shows town shop + belt, descends, and attacks', () => {
    const { container } = renderWithProviders(<Diablo2 windowId="w" />);

    // Title screen with class portraits
    expect(screen.getByText('DIABLO II')).toBeTruthy();
    expect(container.querySelector('canvas')).toBeTruthy(); // portrait sprite

    // Begin as a Barbarian -> town
    fireEvent.click(screen.getByText('Barbarian'));
    expect(screen.getByText('Rogue Encampment')).toBeTruthy();
    expect(screen.getByText(/Buy Health/)).toBeTruthy();
    expect(screen.getByText(/Buy Mana/)).toBeTruthy();

    // Descend -> dungeon shows the skill bar and a populated battlefield
    fireEvent.click(screen.getByText(/Descend \(Lv 1\)/));
    expect(screen.getByText('Bash')).toBeTruthy(); // Barbarian level-1 skill
    expect(screen.getByText(/foes/)).toBeTruthy();

    // Attack the first foe (a tile is a button with a sprite canvas + hp text)
    const enemyTile = Array.from(container.querySelectorAll('button')).find(
      (b) => b.querySelector('canvas') && /\d+\s*\/\s*\d+/.test(b.textContent ?? ''),
    );
    expect(enemyTile).toBeTruthy();
    fireEvent.click(enemyTile as HTMLButtonElement);

    // Still coherent after the swing
    expect(screen.getByText(/foes/)).toBeTruthy();
  });

  it('arms a targeted skill without immediately casting it', () => {
    const { container } = renderWithProviders(<Diablo2 windowId="w" />);
    fireEvent.click(screen.getByText('Sorceress'));
    fireEvent.click(screen.getByText(/Descend \(Lv 1\)/));

    const before = container.querySelectorAll('button').length;
    fireEvent.click(screen.getByText('Fire Bolt')); // single-target -> arms, no cast
    // Battlefield unchanged (no foe removed), skill still listed
    expect(screen.getByText('Fire Bolt')).toBeTruthy();
    expect(container.querySelectorAll('button').length).toBe(before);
  });
});
