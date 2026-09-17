import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import config from '../config/web-deploy.json' with { type: 'json' };
import './check-web-build.mjs';

// Reuse the owner's existing demo hosting. Never edit its router, other sites,
// bucket configuration or account plans; never delete old assets during updates.
process.loadEnvFile(process.env.FIELDBOOK_DEPLOY_ENV ?? `${homedir()}/.cloudflare.env`);
for (const key of [
  'CLOUDFLARE_API_TOKEN',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_S3_ENDPOINT',
])
  if (!process.env[key]) throw new Error(`Missing deployment variable: ${key}`);
const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});
const types = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json',
  webmanifest: 'application/manifest+json',
  svg: 'image/svg+xml',
  png: 'image/png',
  pmtiles: 'application/octet-stream',
  apk: 'application/vnd.android.package-archive',
};
async function files(dir, prefix = '') {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = `${prefix}${entry.name}`;
    if (entry.isDirectory()) result.push(...(await files(`${dir}/${entry.name}`, `${name}/`)));
    else if (entry.name !== '_headers') result.push(name);
  }
  return result;
}
async function cloudflare(path, body) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(`Cloudflare request failed (${response.status}); check token permissions.`);
  return data.result;
}
try {
  const zones = await cloudflare(`/zones?name=${encodeURIComponent(config.zoneName)}`);
  const zone = zones.find((z) => z.name === config.zoneName);
  if (!zone) throw new Error('The configured hosting zone is not accessible.');
  const paths = await files('dist-web');
  // Explicitly publish a built Android compatibility update when requested.
  // APKs never enter the web app's public directory or service-worker cache.
  const androidDownload = 'downloads/Fieldbook.apk';
  if (process.argv.includes('--android')) paths.push(androidDownload);
  const order = (p) => (p === 'sw.js' ? 2 : p === 'index.html' ? 1 : 0);
  paths.sort((a, b) => order(a) - order(b));
  const uploads = paths.map((path) => ({ path, prefix: config.prefix, siteUrl: config.siteUrl }));
  // A separate origin remains downloadable even when an older web app's
  // service worker still intercepts every navigation on the main site.
  if (process.argv.includes('--android'))
    uploads.push({
      path: 'Fieldbook.apk',
      prefix: config.androidPrefix,
      siteUrl: config.androidSiteUrl,
    });
  let uploaded = 0;
  for (const { path, prefix } of uploads) {
    const isAndroid = path.endsWith('.apk');
    const body = await readFile(
      isAndroid ? 'android/app/build/outputs/apk/debug/app-debug.apk' : `dist-web/${path}`,
    );
    const key = `${prefix}/${path}`;
    const md5 = `"${createHash('md5').update(body).digest('hex')}"`;
    let existing;
    try {
      existing = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
    } catch (error) {
      if (error.$metadata?.httpStatusCode !== 404) throw error;
    }
    const disposition = isAndroid ? 'attachment; filename="Fieldbook.apk"' : undefined;
    if (existing?.ETag === md5 && existing.ContentDisposition === disposition) continue;
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: types[path.split('.').pop()] ?? 'application/octet-stream',
        ...(disposition ? { ContentDisposition: disposition } : {}),
        CacheControl: path.startsWith('assets/')
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
      }),
    );
    uploaded++;
    console.log(`Uploaded ${path}`);
  }
  // Purge only this site's URLs, including negative cache entries from preflight.
  // Purge on reruns too, so an interrupted previous publish is recoverable.
  const urls = uploads.flatMap(({ path, prefix, siteUrl }) => [
    `${config.originUrl}/${prefix}/${path}`,
    `${siteUrl}/${path}`,
  ]);
  urls.push(`${config.siteUrl}/`);
  for (let i = 0; i < urls.length; i += 30)
    await cloudflare(`/zones/${zone.id}/purge_cache`, { files: urls.slice(i, i + 30) });
  for (const path of ['index.html', 'sw.js', 'manifest.webmanifest']) {
    const response = await fetch(`${config.siteUrl}/${path}`, { cache: 'no-store' });
    const local = await readFile(`dist-web/${path}`);
    if (!response.ok || !Buffer.from(await response.arrayBuffer()).equals(local))
      throw new Error(
        `Published ${path} does not match this build. Retry after cache propagation.`,
      );
  }
  const map = paths.find((p) => p.endsWith('.pmtiles'));
  const range = await fetch(`${config.siteUrl}/${map}`, { headers: { Range: 'bytes=0-126' } });
  const bytes = Buffer.from(await range.arrayBuffer());
  if (range.status !== 206 || bytes.length !== 127 || bytes.subarray(0, 7).toString() !== 'PMTiles')
    throw new Error('Hosted map range validation failed.');
  if (process.argv.includes('--android')) {
    const apk = await fetch(`${config.androidSiteUrl}/Fieldbook.apk`, { cache: 'no-store' });
    const local = await readFile('android/app/build/outputs/apk/debug/app-debug.apk');
    if (
      !apk.ok ||
      apk.headers.get('content-type') !== types.apk ||
      !Buffer.from(await apk.arrayBuffer()).equals(local)
    )
      throw new Error('Hosted Android download does not match the built APK.');
    console.log(`Verified Android APK: ${config.androidSiteUrl}/Fieldbook.apk`);
  }
  await mkdir('artifacts', { recursive: true });
  await writeFile(
    'artifacts/web-deployment.json',
    JSON.stringify(
      { url: config.siteUrl, at: new Date().toISOString(), uploaded, files: paths.length },
      null,
      2,
    ),
  );
  console.log(
    `Verified ${config.siteUrl}: app, service worker, manifest and map ranges. ${uploaded} files uploaded.`,
  );
} catch (error) {
  // SDK errors can contain request details; do not print credential-bearing objects.
  console.error(
    error.name === 'Error'
      ? error.message
      : `Deployment failed: ${error.name}. Check credentials, permissions and connectivity.`,
  );
  process.exitCode = 1;
} finally {
  client.destroy();
}
