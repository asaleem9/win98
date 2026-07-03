import { findSiteByUrl, getAllSites } from './registry';

/** Strip a URL down to its host, e.g. 'http://www.Yahoo.com/news' → 'www.yahoo.com'. */
export function hostOf(url: string): string {
  let s = url.trim().toLowerCase();
  s = s.replace(/^[a-z]+:\/\//, ''); // drop protocol (http://, ftp://…)
  s = s.split(/[/?#]/)[0]; // drop path/query/fragment
  return s;
}

/** Drop a leading 'www.' so 'www.yahoo.com' and 'yahoo.com' compare equal. */
export function bareHost(host: string): string {
  return host.replace(/^www\./, '');
}

function registeredHosts(): Set<string> {
  const hosts = new Set<string>();
  for (const site of getAllSites()) {
    for (const u of site.urls) hosts.add(bareHost(hostOf(u)));
  }
  return hosts;
}

/**
 * Deterministic FNV-1a hash so a given URL always "loads" at the same speed —
 * repeat visits feel cached, and tests can assert exact durations.
 */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function normalize(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, '');
}

/**
 * How long (ms) a page should take to "download" over a 56k modem. Seeded per
 * URL so it's stable across visits; a page already in the cache snaps in fast.
 */
export function loadDurationFor(url: string, cached: boolean): number {
  const h = hashString(normalize(url));
  if (cached) return 140 + (h % 200); // 140–340ms — a warm cache
  return 800 + (h % 1700); // 800–2500ms — cold, dial-up speed
}

export type PageKind = 'site' | 'dns' | 'http404' | 'offline';

/**
 * Decide what the browser should show for a URL:
 *  - working offline           → the "unavailable offline" page
 *  - a registered site         → the site itself
 *  - a known host, unknown path → HTTP 404 (e.g. yahoo.com/does-not-exist)
 *  - anything else             → DNS failure (host can't be resolved)
 */
export function classifyPage(url: string, opts: { workOffline: boolean }): PageKind {
  if (opts.workOffline) return 'offline';
  if (findSiteByUrl(url)) return 'site';
  if (registeredHosts().has(bareHost(hostOf(url)))) return 'http404';
  return 'dns';
}

/** A filesystem-safe name for the temp .htm file View Source writes out. */
export function sourceFileName(url: string): string {
  const site = findSiteByUrl(url);
  if (site) return `${site.key}.htm`;
  const host = bareHost(hostOf(url)).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `${host || 'page'}.htm`;
}

/**
 * Fabricate the kind of HTML a 1998 site would have shipped: no doctype, ALL-CAPS
 * tags, <FONT>/<TABLE>/<CENTER>, FrontPage cruft, and an "under construction"
 * comment. Built from the site's own title/description so View Source feels real.
 */
export function generateSourceHtml(url: string): string {
  const site = findSiteByUrl(url);
  const title = site?.title ?? url;
  const description = site?.description ?? 'This page cannot be displayed.';
  const keywords = site?.keywords ?? [];
  return [
    '<!-- created with Microsoft FrontPage 4.0 -->',
    '<HTML>',
    '<HEAD>',
    `<TITLE>${title}</TITLE>`,
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=windows-1252">',
    `<META NAME="keywords" CONTENT="${keywords.join(', ')}">`,
    `<META NAME="description" CONTENT="${description}">`,
    '<META NAME="GENERATOR" CONTENT="Microsoft FrontPage 4.0">',
    '</HEAD>',
    '<BODY BGCOLOR="#FFFFFF" TEXT="#000000" LINK="#0000FF" VLINK="#800080" BACKGROUND="images/tile.gif">',
    '<CENTER>',
    '<TABLE WIDTH="600" BORDER="0" CELLPADDING="4" CELLSPACING="0">',
    '  <TR>',
    `    <TD><FONT FACE="Arial,Helvetica" SIZE="5" COLOR="#000080"><B>${title}</B></FONT></TD>`,
    '  </TR>',
    '  <TR>',
    `    <TD><FONT FACE="Arial,Helvetica" SIZE="2">${description}</FONT></TD>`,
    '  </TR>',
    '</TABLE>',
    '</CENTER>',
    '<!-- begin content -->',
    '<P><FONT FACE="Times New Roman" SIZE="3">Welcome to our home page! This site is best',
    'viewed with Microsoft Internet Explorer 5 at 800x600 resolution.</FONT></P>',
    '<HR SIZE="2" WIDTH="600">',
    '<CENTER>',
    '<FONT FACE="Arial" SIZE="1">',
    `Copyright &copy; 1999. All rights reserved. Last updated 01/15/1999.<BR>`,
    'You are visitor number <B>000012847</B>!',
    '</FONT>',
    '</CENTER>',
    '<!-- This page is under construction -->',
    '</BODY>',
    '</HTML>',
    '',
  ].join('\n');
}
