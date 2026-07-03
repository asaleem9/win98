import { ReactNode } from 'react';
import { site as yahoo } from './Yahoo1998';
import { site as geocities } from './GeoCities';
import { site as altavista } from './AltaVista';
import { site as hampster } from './HampsterDance';
import { site as askjeeves } from './AskJeeves';
import { site as webring } from './WebRing';
import { site as downloadram } from './DownloadMoreRam';
import { site as blank } from './Blank';

export interface SiteRenderProps {
  onNavigate: (url: string) => void;
}

/**
 * A fake website the browser can render. Adding a new site means creating one
 * websites/<Name>.tsx that exports a `site: SiteDef` and dropping it into SITES
 * below — no more touching a union, URL map, title map, and JSX switch.
 */
export interface SiteDef {
  key: string;
  /** URLs (any form the address bar might carry) that resolve to this site. */
  urls: string[];
  title: string;
  keywords: string[];
  description: string;
  render: (props: SiteRenderProps) => ReactNode;
}

export const SITES: SiteDef[] = [
  yahoo,
  geocities,
  altavista,
  hampster,
  askjeeves,
  webring,
  downloadram,
  blank,
];

function normalizeUrl(u: string): string {
  return u.trim().toLowerCase().replace(/\/+$/, '');
}

export function getAllSites(): SiteDef[] {
  return SITES;
}

/** Resolve an address-bar value to a registered site, or null (→ 404). */
export function findSiteByUrl(url: string): SiteDef | null {
  const target = normalizeUrl(url);
  if (!target) return null;
  return SITES.find((site) => site.urls.some((u) => normalizeUrl(u) === target)) ?? null;
}
