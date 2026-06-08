/**
 * Single source of truth for all user-facing brand strings + URLs.
 *
 * NEVER hardcode the brand name or domain in any other file. Always import
 * from this module — that way a rebrand is a single .env edit + this file.
 *
 * `.pages.dev` rejection guard included from day one — Cloudflare Pages users
 * routinely set PUBLIC_SITE_URL to the *.pages.dev URL during pre-domain
 * deploys, and that stale value poisons canonical/OG/sitemap forever. See
 * p2pdatasharing pitfall #40.
 */

const env = import.meta.env;

const DEFAULT_DOMAIN = "screencolorpicker.com";
const DEFAULT_URL = `https://${DEFAULT_DOMAIN}`;
const TOXIC = /\.pages\.dev/i;

const rawSiteUrl = env.PUBLIC_SITE_URL ?? DEFAULT_URL;
const rawSiteDomain = env.PUBLIC_SITE_DOMAIN ?? DEFAULT_DOMAIN;

const siteUrl = TOXIC.test(rawSiteUrl) ? DEFAULT_URL : rawSiteUrl;
const siteDomain = TOXIC.test(rawSiteDomain) ? DEFAULT_DOMAIN : rawSiteDomain;

export const site = {
  // "Screen Color Picker" — both the brand AND the #1 SEO keyword. The brand
  // name being an exact-match for the search query is intentional; this is
  // a descriptive-first, keyword-targeted tool.
  name: env.PUBLIC_SITE_NAME ?? "Screen Color Picker",
  shortName: env.PUBLIC_SITE_SHORT_NAME ?? "Screen Color Picker",
  tagline:
    env.PUBLIC_SITE_TAGLINE ??
    "Pick any color from your screen. Free, private, zero install.",
  description:
    env.PUBLIC_SITE_DESCRIPTION ??
    "Pick any color from anywhere on your screen — your IDE, Photoshop, a YouTube video, a PDF, even another monitor. Free, in-browser, zero install. Built on the EyeDropper API.",
  domain: siteDomain,
  url: siteUrl.replace(/\/+$/, ""),
  basePath: (env.PUBLIC_BASE_PATH ?? "/").replace(/\/?$/, "/"),
  github: env.PUBLIC_GITHUB_URL ?? "https://github.com/shrestha-tripathi/screencolorpicker",
  ga4Id: env.PUBLIC_GA4_ID ?? "",

  // Author + contact (used by trust pages + JSON-LD)
  //
  // contactEmail is INTENTIONALLY a personal Gmail address, not a domain-mail
  // (e.g. hello@screencolorpicker.com). User has standardized on direct
  // personal contact across all microtools — single inbox to monitor, no
  // domain-mail setup overhead, and faster reply turnaround.
  author: env.PUBLIC_SITE_AUTHOR ?? "Shrestha Tripathi",
  contactEmail: env.PUBLIC_SITE_CONTACT_EMAIL ?? "shrestha.tripathi@gmail.com",
  jurisdiction: env.PUBLIC_SITE_JURISDICTION ?? "India",
  locale: env.PUBLIC_SITE_LOCALE ?? "en",

  /**
   * Google Analytics 4 Measurement ID (format: G-XXXXXXXXXX). Empty string
   * disables the gtag.js snippet entirely — useful for forks and self-hosts.
   * Only injected in production builds so localhost dev never pollutes the
   * analytics property. See astro-google-analytics-4 skill.
   */
  gaId: env.PUBLIC_GA_MEASUREMENT_ID ?? "G-39NCRFEZPJ",
} as const;

/**
 * Build an absolute internal URL respecting `basePath`. Use everywhere instead
 * of bare `/foo` so the same build works under `/` and `/subpath/`.
 */
export const b = (path: string): string => {
  const cleanBase = site.basePath.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

/**
 * Build an absolute URL (origin + path) for OG meta, canonical, sitemap.
 */
export const absoluteUrl = (path: string): string => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${site.url}${cleanPath}`;
};
