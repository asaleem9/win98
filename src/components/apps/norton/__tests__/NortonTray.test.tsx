import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import NortonAntiVirus from '../NortonAntiVirus';

describe('Norton system-tray shield', () => {
  it('registers the shield icon the first time the app is opened', () => {
    const details: unknown[] = [];
    const handler = (e: Event) => details.push((e as CustomEvent).detail);
    window.addEventListener('win98-tray-register', handler);

    renderWithProviders(<NortonAntiVirus windowId="w1" />);

    expect(details).toContainEqual({
      id: 'norton',
      icon: '/icons/norton-16.svg',
      tooltip: 'Norton AntiVirus',
    });

    window.removeEventListener('win98-tray-register', handler);
  });
});
