import { describe, expect, it } from 'vitest';
import { getDomain, normalizeUrl, siteName, suggestTitle, validateUrl } from '../src/lib/url';

function ok(input: string) {
  const result = validateUrl(input);
  if (!result.ok) throw new Error(`expected "${input}" to be valid, got: ${result.error}`);
  return result;
}

function error(input: string) {
  const result = validateUrl(input);
  if (result.ok) throw new Error(`expected "${input}" to be invalid`);
  return result.error;
}

describe('validateUrl', () => {
  it('accepts normal http and https URLs', () => {
    expect(ok('https://example.com').url).toBe('https://example.com/');
    expect(ok('http://example.com/path?q=1').url).toBe('http://example.com/path?q=1');
  });

  it('adds https:// when the scheme is missing', () => {
    expect(ok('github.com').url).toBe('https://github.com/');
    expect(ok('  github.com/facebook/react  ').url).toBe('https://github.com/facebook/react');
    expect(ok('//cdn.example.com/x').url).toBe('https://cdn.example.com/x');
  });

  it('accepts localhost, ports and IP addresses', () => {
    expect(ok('localhost:5173').url).toBe('https://localhost:5173/');
    expect(ok('http://192.168.1.10:8080/admin').domain).toBe('192.168.1.10');
    expect(ok('http://[::1]:3000').url).toBe('http://[::1]:3000/');
  });

  it('rejects empty input and spaces', () => {
    expect(error('')).toMatch(/enter a url/i);
    expect(error('   ')).toMatch(/enter a url/i);
    expect(error('exa mple.com')).toMatch(/spaces/i);
  });

  it('rejects unsupported and dangerous schemes', () => {
    expect(error('ftp://example.com')).toMatch(/http/);
    expect(error('javascript:alert(1)')).toMatch(/http/);
    expect(error('JavaScript:alert(1)')).toMatch(/http/);
    expect(error('data:text/html,hi')).toMatch(/http/);
    expect(error('mailto:me@example.com')).toMatch(/http/);
    expect(error('file:///C:/secret.txt')).toMatch(/http/);
  });

  it('rejects hosts without a real domain ending', () => {
    expect(error('example')).toMatch(/domain ending/i);
    expect(error('https://example.c')).toMatch(/valid domain ending/i);
    expect(error('example.123')).toMatch(/valid/i); // URL() itself rejects numeric endings
    expect(error('123')).toMatch(/domain/i);
    expect(error('-bad-.com')).toMatch(/invalid characters/i);
  });

  it('rejects embedded credentials', () => {
    expect(error('https://user:pass@example.com')).toMatch(/password/i);
  });

  it('rejects overly long URLs', () => {
    expect(error(`https://example.com/${'a'.repeat(2100)}`)).toMatch(/too long/i);
  });

  it('removes tracking parameters but keeps real ones', () => {
    const result = ok('https://example.com/post?id=7&utm_source=x&utm_medium=y&fbclid=abc');
    expect(result.url).toBe('https://example.com/post?id=7');
  });

  it('reports the domain without www', () => {
    expect(ok('https://www.Example.com/a').domain).toBe('example.com');
  });
});

describe('normalizeUrl (duplicate detection key)', () => {
  it('treats cosmetic differences as the same link', () => {
    const variants = [
      'https://www.example.com/docs/',
      'http://example.com/docs',
      'example.com/docs#intro',
      'HTTPS://EXAMPLE.COM/docs?utm_source=newsletter',
    ];
    const keys = new Set(variants.map(normalizeUrl));
    expect(keys).toEqual(new Set(['example.com/docs']));
  });

  it('ignores query parameter order', () => {
    expect(normalizeUrl('example.com/s?b=2&a=1')).toBe(normalizeUrl('example.com/s?a=1&b=2'));
  });

  it('keeps meaningful differences', () => {
    expect(normalizeUrl('example.com/a')).not.toBe(normalizeUrl('example.com/b'));
    expect(normalizeUrl('example.com/?page=1')).not.toBe(normalizeUrl('example.com/?page=2'));
    expect(normalizeUrl('example.com:8080')).not.toBe(normalizeUrl('example.com'));
    expect(normalizeUrl('docs.example.com')).not.toBe(normalizeUrl('example.com'));
  });

  it('returns null for invalid input', () => {
    expect(normalizeUrl('not a url')).toBeNull();
  });
});

describe('titles and domains', () => {
  it('derives a site name from the host', () => {
    expect(siteName('docs.github.com')).toBe('Github');
    expect(siteName('www.bbc.co.uk')).toBe('Bbc');
    expect(siteName('localhost')).toBe('Localhost');
  });

  it('suggests a title from the last path segment', () => {
    expect(suggestTitle('https://github.com/')).toBe('Github');
    expect(suggestTitle('https://example.com/blog/my-first_post.html')).toBe('My first post · Example');
    expect(suggestTitle('https://example.com/item/12345')).toBe('Example');
  });

  it('extracts domains', () => {
    expect(getDomain('https://www.youtube.com/watch?v=1')).toBe('youtube.com');
    expect(getDomain('garbage')).toBe('garbage');
  });
});
