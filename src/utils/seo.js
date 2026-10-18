/**
 * Place4U — Single source of SEO truth
 *
 * The app is a client-rendered SPA served from ONE static index.html, so every
 * tag in <head> is only a default until a route applies its own. This module
 * owns:
 *
 *   - the canonical site origin and the default social copy,
 *   - the per-route title / description / robots map,
 *   - the DOM writers that upsert <title>, <meta>, <link rel="canonical"> and
 *     JSON-LD blocks.
 *
 * Why it must stay the single source: the head used to be one unchanging block,
 * so every URL — the marketing home, the five legal pages, and even the
 * signed-in portals — shipped the same title, the same description, an
 * indexable `robots`, and no canonical. A route that hand-rolls its own tags
 * reintroduces exactly that, so don't: add an entry to ROUTE_SEO instead.
 *
 * Private surfaces (auth + portals) are `noindex` here AND disallowed in
 * public/robots.txt. Belt and braces: a crawler that executes JS would
 * otherwise see the same hashed title on every private URL, and one that does
 * not must be told to stay out.
 */

// Canonical origin. VITE_SITE_URL lets a dev/uat deploy point its canonicals at
// itself (see .env.example); production falls back to the live domain. The
// trailing slash is stripped so `${SITE_URL}${path}` is always well formed.
export const SITE_URL = (import.meta.env?.VITE_SITE_URL || 'https://place4u.xyz').replace(/\/+$/, '');

export const SITE_NAME = 'Place4U';

export const DEFAULT_DESCRIPTION =
  "South Africa's rental matching platform. Submit one application and get introduced to reviewed student digs, cottages and apartments — landlord identity and ownership documents are reviewed first.";

export const DEFAULT_IMAGE = '/hero-loft.jpg';
export const DEFAULT_IMAGE_ALT = 'A light-filled student loft apartment listed on Place4U';

// Rich-result friendly defaults. max-image-preview:large opts this site into the
// larger thumbnail in Google results; the snippet limits stop it being trimmed.
export const DEFAULT_ROBOTS =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

const PRIVATE_ROBOTS = 'noindex, nofollow, noarchive';

/**
 * Public, indexable pages. `path` is the canonical URL path (no trailing slash).
 * Titles stay under ~65 chars so Google does not rewrite them.
 */
export const ROUTE_SEO = {
  '/': {
    title: 'Place4U | Verified Student Accommodation & Rentals in South Africa',
    description: DEFAULT_DESCRIPTION
  },
  '/privacy': {
    title: 'Privacy Policy & POPIA Notice | Place4U',
    description:
      'How Place4U collects, processes, stores and protects your personal information under the Protection of Personal Information Act (POPIA), and how to exercise your data rights.'
  },
  '/terms': {
    title: 'Terms of Service & Platform Guidelines | Place4U',
    description:
      'The terms governing use of Place4U: our role as a technology and matching platform, the one-time assistance fee, the platform disclaimers, and dispute resolution.'
  },
  '/compliance': {
    title: 'Statutory Compliance & Regulatory Disclosures | Place4U',
    description:
      "Place4U's compliance framework — POPIA, the Property Practitioners Act and the Consumer Protection Act — and how landlord identity and ownership documents are reviewed."
  },
  '/dispute-resolution': {
    title: 'Dispute Resolution Guidelines | Place4U',
    description:
      'How complaints and disputes are escalated at Place4U: the governance desk, the statutory tribunal and ombudsman recourse, with the categories and timelines that apply.'
  },
  '/cookie-preferences': {
    title: 'Cookie Preferences & Tracking Controls | Place4U',
    description:
      'Manage your cookie and tracking preferences. Place4U stores only what the platform needs to work and honours your POPIA consent choices.'
  }
};

/**
 * Public paths that duplicate a ROUTE_SEO entry (the app aliases two of them).
 * `canonicalPath` folds the duplicate onto its primary URL; `noindex` keeps the
 * thin duplicate out of the index entirely.
 */
export const ROUTE_ALIASES = {
  '/popia-notice': { canonicalPath: '/compliance', noindex: true },
  '/cookies': { canonicalPath: '/cookie-preferences', noindex: true }
};

/**
 * Auth + signed-in surfaces. Always noindex, never in the sitemap. The label is
 * the tab title; anything under the path (e.g. /admin/payments) inherits it.
 */
export const PRIVATE_ROUTES = {
  '/login': 'Sign In',
  '/signup': 'Create Your Account',
  '/reset-password': 'Reset Password',
  '/change-password': 'Change Password',
  '/complete-profile': 'Complete Your Profile',
  '/auth/callback': 'Signing In',
  '/tenant': 'Tenant Portal',
  '/landlord': 'Landlord Portal',
  '/agent': 'Agent Portal',
  '/admin': 'Admin Console'
};

/** Absolute URL for a site-relative path (or passthrough for an absolute one). */
export function toAbsolute(value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
}

/** Strip query/hash and any trailing slash (except the root) from a pathname. */
function normalizePath(pathname) {
  const path = String(pathname || '/').split('?')[0].split('#')[0];
  if (path.length > 1 && path.endsWith('/')) return path.replace(/\/+$/, '');
  return path || '/';
}

/** Longest-match private route for a path: exact, or any child of it. */
function findPrivateRoute(path) {
  if (Object.prototype.hasOwnProperty.call(PRIVATE_ROUTES, path)) return path;
  return (
    Object.keys(PRIVATE_ROUTES).find((prefix) => path.startsWith(`${prefix}/`)) || null
  );
}

function buildSeo({ title, description, canonicalPath, robots }) {
  const url = toAbsolute(canonicalPath);
  return {
    title,
    description,
    robots,
    url,
    image: toAbsolute(DEFAULT_IMAGE),
    imageAlt: DEFAULT_IMAGE_ALT,
    ogType: 'website',
    locale: 'en_ZA'
  };
}

/**
 * Resolve the full metadata object for a pathname. Pure — no DOM access — so it
 * can be unit-tested or inspected without a browser.
 */
export function resolveSeoForPath(pathname) {
  const path = normalizePath(pathname);

  const privateRoute = findPrivateRoute(path);
  if (privateRoute) {
    return buildSeo({
      title: `${PRIVATE_ROUTES[privateRoute]} | ${SITE_NAME}`,
      description:
        'Sign in to Place4U to manage your applications, listings and introductions.',
      canonicalPath: path,
      robots: PRIVATE_ROBOTS
    });
  }

  const alias = ROUTE_ALIASES[path];
  const known = ROUTE_SEO[path];
  // An alias renders the same component as its primary, so it adopts the
  // primary's title/description too — only its canonical differs.
  const seo = known || (alias ? ROUTE_SEO[alias.canonicalPath] : null) || ROUTE_SEO['/'];

  return buildSeo({
    title: seo.title,
    description: seo.description,
    // Unknown paths are redirected to the home page by the router, so point the
    // canonical there rather than at a URL that never renders.
    canonicalPath: alias?.canonicalPath || (known ? path : '/'),
    robots: alias?.noindex ? PRIVATE_ROBOTS : DEFAULT_ROBOTS
  });
}

function upsertMeta(attribute, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attribute, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Apply a resolved SEO object to the live document head. Idempotent: it updates
 * the existing tags that ship in index.html (so nothing is duplicated) and only
 * creates a tag when none is present.
 */
export function applySeo(seo) {
  if (typeof document === 'undefined' || !seo) return;

  document.title = seo.title;

  upsertMeta('name', 'description', seo.description);
  upsertMeta('name', 'robots', seo.robots);

  upsertLink('canonical', seo.url);

  upsertMeta('property', 'og:type', seo.ogType);
  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:locale', seo.locale);
  upsertMeta('property', 'og:title', seo.title);
  upsertMeta('property', 'og:description', seo.description);
  upsertMeta('property', 'og:url', seo.url);
  upsertMeta('property', 'og:image', seo.image);
  upsertMeta('property', 'og:image:alt', seo.imageAlt);

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', seo.title);
  upsertMeta('name', 'twitter:description', seo.description);
  upsertMeta('name', 'twitter:image', seo.image);
  upsertMeta('name', 'twitter:image:alt', seo.imageAlt);
}

/**
 * Create/replace a JSON-LD block by id, or remove it when `data` is falsy.
 *
 * Note: a `<script type="application/ld+json">` is a data block, not executed
 * JavaScript, so the strict `script-src 'self'` CSP in _headers / vercel.json
 * does not apply to it (no 'unsafe-inline' needed).
 */
export function setJsonLd(id, data) {
  if (typeof document === 'undefined') return;

  const selector = `script[type="application/ld+json"][data-seo-id="${id}"]`;
  const existing = document.head.querySelector(selector);

  if (!data) {
    if (existing) existing.remove();
    return;
  }

  const el = existing || document.createElement('script');
  el.setAttribute('type', 'application/ld+json');
  el.setAttribute('data-seo-id', id);
  el.textContent = JSON.stringify(data);

  if (!existing) document.head.appendChild(el);
}

/**
 * Structured data for the listings actually rendered in the landing grid. Only
 * fields we genuinely hold are emitted (name, image, locality, price) — no
 * invented detail, and no per-listing URL because a listing opens as an in-page
 * modal rather than its own address. Returns null when there is nothing to
 * describe, which is how the block is removed.
 */
export function buildItemListJsonLd(items, { name = 'Featured reviewed rentals in South Africa' } = {}) {
  const list = (Array.isArray(items) ? items : []).filter(Boolean).slice(0, 24);
  if (list.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: list.length,
    itemListElement: list.map((item, index) => {
      const price = Number(item.numericPrice);

      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Accommodation',
          name: item.title,
          image: toAbsolute(item.image),
          address: {
            '@type': 'PostalAddress',
            addressLocality: item.area || undefined,
            addressCountry: 'ZA'
          },
          ...(Number.isFinite(price) && price > 0
            ? {
                offers: {
                  '@type': 'Offer',
                  price,
                  priceCurrency: 'ZAR',
                  availability: 'https://schema.org/InStock'
                }
              }
            : {})
        }
      };
    })
  };
}
