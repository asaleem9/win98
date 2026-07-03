import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/helpers/renderWithProviders';
import BannerAd, { ADS, adForSeed } from '../websites/BannerAd';

describe('adForSeed', () => {
  it('is deterministic for a given seed and tick', () => {
    expect(adForSeed('geocities', 0)).toBe(adForSeed('geocities', 0));
    expect(adForSeed('geocities', 3)).toBe(adForSeed('geocities', 3));
  });

  it('rotates through the ad pool as the tick advances', () => {
    const start = adForSeed('geocities', 0);
    const next = adForSeed('geocities', 1);
    expect(next).not.toBe(start);
    // A full lap returns to the start.
    expect(adForSeed('geocities', ADS.length)).toBe(start);
  });

  it('different seeds can start on different ads', () => {
    const seeds = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const starts = new Set(seeds.map((s) => adForSeed(s, 0).id));
    expect(starts.size).toBeGreaterThan(1);
  });
});

describe('BannerAd', () => {
  it('navigates to the current ad target on click', () => {
    const onNavigate = vi.fn();
    renderWithProviders(<BannerAd onNavigate={onNavigate} seed="ram-seed" intervalMs={0} />);
    const banner = screen.getByTitle('Advertisement');
    fireEvent.click(banner);
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(adForSeed('ram-seed', 0).target);
  });
});
