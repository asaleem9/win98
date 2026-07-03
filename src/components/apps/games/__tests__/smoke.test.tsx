import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import OregonTrail from '../OregonTrail';
import SimCity from '../SimCity';
import StarCraft from '../StarCraft';
import CommandConquer from '../CommandConquer';
import AgeOfEmpires2 from '../AgeOfEmpires2';
import Diablo2 from '../Diablo2';
import TonyHawk2 from '../TonyHawk2';
import RollerCoasterTycoon from '../RollerCoasterTycoon';

// Smoke test: every era game must mount in jsdom (no 2d canvas context) without
// throwing. Guards against missing getContext null-checks and provider misuse.
const games = {
  OregonTrail,
  SimCity,
  StarCraft,
  CommandConquer,
  AgeOfEmpires2,
  Diablo2,
  TonyHawk2,
  RollerCoasterTycoon,
};

describe('era games smoke render', () => {
  for (const [name, Game] of Object.entries(games)) {
    it(`${name} mounts without crashing`, () => {
      const { unmount } = renderWithProviders(<Game windowId="test-window" />);
      unmount();
    });
  }
});
