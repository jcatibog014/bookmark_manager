// URL validation & normalization.
//
// validateUrl() turns whatever the user typed into either a clean, saveable URL
// or a friendly error message. The `normalized` key is what we use to detect
// duplicates: it ignores differences that don't change the page (scheme, "www.",
// trailing slash, #fragment, tracking params, query param order).

export type UrlCheck =
  | { ok: true; url: string; normalized: string; domain: string }
  | { ok: false; error: string };

const MAX_LENGTH = 2048;

/** Starts with something like "https://" or "ftp://". */
const HAS_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;

/** Schemes written without "//" that must never be saved (e.g. javascript:alert(1)). */
const UNSAFE_SCHEME = /^(javascript|data|vbscript|file|blob|about|mailto|tel|sms|ftp|ssh|chrome|edge):/i;

/** Query params that only track where a click came from. */
const TRACKING_PARAM = /^(utm_[a-z_]+|fbclid|gclid|dclid|gbraid|wbraid|msclkid|yclid|igshid|mc_cid|mc_eid|_hsenc|_hsmi|ref_src)$/i;

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const LABEL = /^[a-z0-9_]([a-z0-9_-]{0,61}[a-z0-9_])?$/;
const TLD = /^([a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

const fail = (error: string): UrlCheck => ({ ok: false, error });

export function validateUrl(input: string): UrlCheck {
  const raw = input.trim();
  if (!raw) return fail('Enter a URL.');
  if (/\s/.test(raw)) return fail("URLs can't contain spaces.");
  if (raw.length > MAX_LENGTH) return fail(`That URL is too long (max ${MAX_LENGTH} characters).`);

  let candidate = raw;
  if (!HAS_SCHEME.test(raw)) {
    if (UNSAFE_SCHEME.test(raw)) return fail('Only http:// and https:// links can be saved.');
    // "example.com" or "//example.com" → assume https.
    candidate = raw.startsWith('//') ? `https:${raw}` : `https://${raw}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return fail("That doesn't look like a valid URL.");
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return fail('Only http:// and https:// links can be saved.');
  }
  if (parsed.username || parsed.password) {
    return fail('Links with a username or password are not allowed.');
  }

  const hostError = checkHost(parsed.hostname, candidate);
  if (hostError) return fail(hostError);

  stripTrackingParams(parsed);

  return {
    ok: true,
    url: parsed.href,
    normalized: normalizeParsed(parsed),
    domain: stripWww(parsed.hostname),
  };
}

/** Returns an error message, or null when the host looks real. */
function checkHost(hostname: string, candidate: string): string | null {
  const host = hostname.replace(/\.$/, '');
  if (!host) return 'The URL is missing a domain name.';
  if (host === 'localhost') return null;
  if (host.startsWith('[')) return null; // IPv6 literal, already validated by URL()

  if (IPV4.test(host)) {
    // URL() expands shorthand like "123" into "0.0.0.123"; only accept IPs the user actually typed.
    return candidate.toLowerCase().includes(host) ? null : 'Add a domain like example.com.';
  }

  const labels = host.split('.');
  if (labels.length < 2) return 'Add a domain ending such as ".com".';
  if (!labels.every((label) => LABEL.test(label))) return 'The domain name contains invalid characters.';
  const tld = labels[labels.length - 1];
  if (!TLD.test(tld)) return `".${tld}" isn't a valid domain ending.`;
  return null;
}

function stripTrackingParams(url: URL): void {
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
  }
}

function normalizeParsed(url: URL): string {
  const host = stripWww(url.hostname).replace(/\.$/, '');
  const port = url.port ? `:${url.port}` : '';
  const path = url.pathname.replace(/\/+$/, '');
  const params = new URLSearchParams(url.search);
  params.sort();
  const query = params.toString();
  return `${host}${port}${path}${query ? `?${query}` : ''}`;
}

function stripWww(hostname: string): string {
  return hostname.replace(/^www\./, '');
}

/** The duplicate-detection key for a URL, or null if it isn't valid. */
export function normalizeUrl(input: string): string | null {
  const check = validateUrl(input);
  return check.ok ? check.normalized : null;
}

export function getDomain(url: string): string {
  try {
    return stripWww(new URL(url).hostname);
  } catch {
    return url;
  }
}

export function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'ac', 'gov', 'edu']);

/** "docs.github.com" → "Github", "bbc.co.uk" → "Bbc". */
export function siteName(hostname: string): string {
  const labels = stripWww(hostname).split('.');
  if (labels.length < 2) return capitalize(labels[0] ?? hostname);
  let i = labels.length - 2;
  if (i > 0 && SECOND_LEVEL.has(labels[i]) && labels[labels.length - 1].length === 2) i--;
  return capitalize(labels[i]);
}

/** A readable default title from the URL itself (we can't fetch the page from the browser). */
export function suggestTitle(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const site = siteName(parsed.hostname);
  const segments = parsed.pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (!last) return site;

  let words: string;
  try {
    words = decodeURIComponent(last);
  } catch {
    words = last;
  }
  words = words
    .replace(/\.[a-z0-9]{1,5}$/i, '')
    .replace(/[-_+]+/g, ' ')
    .trim();
  if (!words || /^\d+$/.test(words)) return site;
  return `${capitalize(words)} · ${site}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
