import { createElement, ReactNode } from 'react';
import { site as yahoo } from './Yahoo1998';
import { site as geocities } from './GeoCities';
import { site as altavista } from './AltaVista';
import { site as hampster } from './HampsterDance';
import { site as askjeeves } from './AskJeeves';
import { site as webring } from './WebRing';
import { site as downloadram } from './DownloadMoreRam';
import { site as blank } from './Blank';
import { site as downloads } from './CnetDownloads';
import { site as ebay } from './Ebay1998';
import { site as amazon } from './Amazon1999';
import { site as dancingbaby } from './DancingBaby';
import { site as midishrine } from './MidiShrine';
import { site as y2k } from './Y2KCountdown';
import { site as hotmail } from './Hotmail1998';
import { site as shadypopups } from './ShadyPopups';
import { site as spacejam } from './SpaceOdyssey';

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
  downloads,
  ebay,
  amazon,
  dancingbaby,
  midishrine,
  y2k,
  hotmail,
  shadypopups,
  spacejam,
  blank,
];

function normalizeUrl(u: string): string {
  return u.trim().toLowerCase().replace(/\/+$/, '');
}

export function getAllSites(): SiteDef[] {
  return SITES;
}

// ---- Published GeoCities pages (FrontPage → IE5) ------------------------------

/** A page the user published from FrontPage, mirrored into the settings blob. */
export interface PublishedSite {
  html: string;
  publishedAt: number;
  userName: string;
  /** The GeoCities user-directory slug, i.e. the ~name in the URL. */
  slug: string;
}

// Key + shape of the persisted settings blob (see SettingsContext). Read
// directly so a page published in FrontPage is browsable even when FrontPage is
// closed; swappable via setPublishedSiteReader so tests need no storage.
const PREFS_STORAGE_KEY = 'win98-prefs-v1';

function readPublishedSiteFromStorage(): PublishedSite | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return null;
    const prefs = JSON.parse(raw) as Record<string, Record<string, unknown>>;
    const site = prefs?.frontpage?.publishedSite as PublishedSite | undefined;
    return site && typeof site.html === 'string' && typeof site.slug === 'string' ? site : null;
  } catch {
    return null;
  }
}

let publishedSiteReader: () => PublishedSite | null = readPublishedSiteFromStorage;

/** Override how the published site is resolved (tests inject without storage);
 *  pass null to restore the default localStorage-backed reader. */
export function setPublishedSiteReader(reader: (() => PublishedSite | null) | null): void {
  publishedSiteReader = reader ?? readPublishedSiteFromStorage;
}

// Matches www.geocities.com/~<name>, with or without scheme / www / trailing path.
const GEOCITIES_USER_RE = /^(?:https?:\/\/)?(?:www\.)?geocities\.com\/~([a-z0-9]+)(?:\/.*)?$/;

/** The ~name in a GeoCities member URL, or null when it isn't one. */
export function geocitiesUserFromUrl(url: string): string | null {
  const m = normalizeUrl(url).match(GEOCITIES_USER_RE);
  return m ? m[1] : null;
}

/** Remove anything that could execute when the published HTML is injected. */
function sanitizePublishedHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

/** The GeoCities SiteDef for a ~name — the published page, or the era "no such
 *  member page" notice when nothing is published there. */
function geocitiesUserSite(slug: string): SiteDef {
  const published = publishedSiteReader();
  const live = published && published.slug === slug ? published : null;
  const url = `www.geocities.com/~${slug}`;
  return {
    key: `geocities-user-${slug}`,
    urls: [url, `http://${url}`],
    title: live ? `${live.userName}'s Home Page - GeoCities` : 'GeoCities: Member Page',
    keywords: ['geocities', 'homepage', 'personal', slug],
    description: live
      ? `${live.userName}'s personal home page on GeoCities.`
      : 'A GeoCities member directory page.',
    render: () => (live ? renderPublishedPage(live) : renderMemberNotFound(slug)),
  };
}

function renderPublishedPage(site: PublishedSite): ReactNode {
  return createElement('div', {
    className: 'min-h-full bg-white text-black p-2',
    dangerouslySetInnerHTML: { __html: sanitizePublishedHtml(site.html) },
  });
}

function renderMemberNotFound(slug: string): ReactNode {
  return createElement(
    'div',
    { className: 'min-h-full bg-[#000033] text-[#00ff00] font-[Comic_Sans_MS,cursive] p-6 text-center' },
    createElement('div', { key: 'h', className: 'text-[#ffff00] text-[22px] font-bold mb-3' }, 'GeoCities'),
    createElement(
      'div',
      { key: 'b', className: 'inline-block border-2 border-[#ffff00] bg-[#000066] px-4 py-3 text-[14px]' },
      createElement('div', { key: 't', className: 'text-[#ff6600] text-[16px] font-bold mb-2' }, 'Page Not Found'),
      createElement(
        'div',
        { key: 'm', className: 'text-[#cccccc]' },
        `This GeoCities page does not exist yet.`,
      ),
      createElement(
        'div',
        { key: 'u', className: 'text-[#66ff66] text-[11px] mt-2' },
        `/~${slug}`,
      ),
    ),
    createElement(
      'div',
      { key: 'f', className: 'text-[#999999] text-[11px] mt-4' },
      'The member you are looking for has not built their home page yet.',
    ),
  );
}

/** Resolve an address-bar value to a registered site, or null (→ 404). */
export function findSiteByUrl(url: string): SiteDef | null {
  const target = normalizeUrl(url);
  if (!target) return null;
  const registered = SITES.find((site) => site.urls.some((u) => normalizeUrl(u) === target));
  if (registered) return registered;
  const slug = geocitiesUserFromUrl(url);
  if (slug) return geocitiesUserSite(slug);
  return null;
}
