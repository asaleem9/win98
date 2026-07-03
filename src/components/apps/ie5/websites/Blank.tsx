import type { SiteDef } from './registry';

// about:blank — an empty white page, routed through the registry like any site.
export const site: SiteDef = {
  key: 'blank',
  urls: ['about:blank'],
  title: 'Blank Page',
  keywords: ['blank', 'empty', 'about'],
  description: 'An empty page.',
  render: () => <div className="h-full bg-white" />,
};
