import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT_DIR = 'out';
const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g;
const CHARSET_META = /<meta charSet="utf-8"\s*\/?>/i;

// Next の static export が出力するインラインスクリプトはビルドごとに変わるため、出力後にハッシュを計算して meta で埋め込む
const buildPolicy = (scriptHashes) => [
  "default-src 'self'",
  `script-src 'self' ${scriptHashes.join(' ')}`.trim(),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const listHtml = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return listHtml(path);
    return e.name.endsWith('.html') ? [path] : [];
  }));
  return files.flat();
};

for (const file of await listHtml(OUT_DIR)) {
  const html = await readFile(file, 'utf8');
  if (html.includes('http-equiv="Content-Security-Policy"')) continue;

  const hashes = new Set();
  for (const [, body] of html.matchAll(INLINE_SCRIPT)) {
    if (!body) continue;
    hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }

  const meta = `<meta http-equiv="Content-Security-Policy" content="${buildPolicy([...hashes])}"/>`;
  // charset 宣言は先頭 1024 バイト以内に置く必要があるので、その直後に入れる
  const anchor = CHARSET_META.test(html) ? CHARSET_META : /<head[^>]*>/;
  const injected = html.replace(anchor, (tag) => `${tag}${meta}`);
  if (injected === html) throw new Error(`<head> not found: ${file}`);
  await writeFile(file, injected);
}
