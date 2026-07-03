import { render } from '@testing-library/react';
import AIM from '../AIM';

function captureDetails(eventName: string) {
  const details: unknown[] = [];
  const handler = (e: Event) => details.push((e as CustomEvent).detail);
  window.addEventListener(eventName, handler);
  return {
    details,
    stop: () => window.removeEventListener(eventName, handler),
  };
}

describe('AIM system-tray presence', () => {
  it('registers the running-man icon on mount and unregisters on unmount', () => {
    const reg = captureDetails('win98-tray-register');
    const unreg = captureDetails('win98-tray-unregister');

    const { unmount } = render(<AIM windowId="w1" />);
    expect(reg.details).toContainEqual({
      id: 'aim',
      icon: '/icons/aim-16.svg',
      tooltip: 'AIM - SurfDude98',
    });

    unmount();
    expect(unreg.details).toContainEqual({ id: 'aim' });

    reg.stop();
    unreg.stop();
  });
});
