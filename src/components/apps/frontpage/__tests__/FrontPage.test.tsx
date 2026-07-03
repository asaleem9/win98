import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import FrontPage from '../FrontPage';

describe('FrontPage', () => {
  it('mounts without throwing', () => {
    expect(() => renderWithProviders(<FrontPage windowId="w1" />)).not.toThrow();
  });
});
