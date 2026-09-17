import { afterEach, expect, it } from 'vitest';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { createServer as createHttp2Server, connect, type Http2Server } from 'node:http2';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diagnosticsMiddleware } from '../../scripts/diagnostics-plugin';
let server: Server | Http2Server, directory: string;
let drain: () => Promise<void>;
afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await drain();
  await rm(directory, { recursive: true, force: true });
});
async function start() {
  directory = await mkdtemp(join(tmpdir(), 'fieldbook-logs-'));
  const middleware = diagnosticsMiddleware(directory);
  drain = middleware.drain;
  server = createServer((req, res) =>
    middleware(req, res, () => {
      res.statusCode = 404;
      res.end();
    }),
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  return `http://127.0.0.1:${address.port}`;
}
const event = {
  id: 'event-1',
  session: 'phone-1',
  at: new Date().toISOString(),
  event: 'photo.selected',
  level: 'info',
  details: { filename: '<img src=x onerror=alert(1)>.jpg', bytes: 123 },
};
it('persists metadata, acknowledges it and exposes a safe text viewer', async () => {
  const base = await start();
  const response = await fetch(base + '/__fieldbook_debug/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ events: [{ ...event, unexpected: 'discard' }] }),
  });
  expect(await response.json()).toEqual({ accepted: 1 });
  const saved = JSON.parse(await readFile(join(directory, 'events.jsonl'), 'utf8'));
  expect(saved.details.filename).toBe(event.details.filename);
  expect(saved.unexpected).toBeUndefined();
  expect(JSON.parse(await readFile(join(directory, 'sessions/phone-1.jsonl'), 'utf8')).id).toBe(
    event.id,
  );
  expect(await (await fetch(base + '/__fieldbook_debug/events')).json()).toHaveLength(1);
  const html = await (await fetch(base + '/__fieldbook_debug')).text();
  expect(html).toContain('textContent=JSON.stringify(e.details');
  expect(html).not.toContain('innerHTML');
});
it('stores photos by ID with metadata, retries without duplicates, and rejects invalid uploads', async () => {
  const base = await start();
  const bytes = await readFile('tests/fixtures/arbutus-unedo.jpg');
  const metadata = {
    id: 'photo-1',
    session: 'phone-1',
    at: new Date().toISOString(),
    filename: '../../untrusted.jpg',
  };
  const headers = {
    'Content-Type': 'image/jpeg',
    'X-Fieldbook-Photo': encodeURIComponent(JSON.stringify(metadata)),
    Origin: base,
  };
  const endpoint = base + '/__fieldbook_debug/photos/photo-1';
  const post = (body = bytes, extra = {}) =>
    fetch(endpoint, { method: 'POST', headers: { ...headers, ...extra }, body });
  expect(await (await post()).json()).toEqual({ accepted: 'photo-1' });
  expect(await (await post()).json()).toEqual({ accepted: 'photo-1' });
  expect(await readFile(join(directory, 'photos/photo-1.jpg'))).toEqual(bytes);
  const photos = await (await fetch(base + '/__fieldbook_debug/photos')).json();
  expect(photos).toHaveLength(1);
  expect(photos[0].filename).toBe('../../untrusted.jpg');
  expect(Buffer.from(await (await fetch(endpoint)).arrayBuffer())).toEqual(bytes);
  expect((await post(bytes, { Origin: 'https://unrelated.example' })).status).toBe(403);
  expect((await post(Buffer.from('invalid'))).status).toBe(400);
  expect((await post(Buffer.alloc(8_000_001))).status).toBe(413);
  expect(
    (
      await post(bytes, {
        'X-Fieldbook-Photo': encodeURIComponent(JSON.stringify({ ...metadata, id: '../bad' })),
      })
    ).status,
  ).toBe(400);
});
it('rejects cross-origin, malformed and oversized batches without writing them', async () => {
  const base = await start(),
    endpoint = base + '/__fieldbook_debug/events';
  const post = (body: string, origin = base) =>
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body,
    });
  expect(
    (await post(JSON.stringify({ events: [event] }), 'https://unrelated.example')).status,
  ).toBe(403);
  expect((await post('{broken')).status).toBe(400);
  expect((await post(JSON.stringify({ events: [{ ...event, session: null }] }))).status).toBe(400);
  expect((await post(JSON.stringify({ events: Array(21).fill(event) }))).status).toBe(400);
  expect((await post('x'.repeat(300001))).status).toBe(413);
  expect(await (await fetch(endpoint)).json()).toEqual([]);
});

it('accepts phone HTTP/2 authority for logs and photos while rejecting another origin', async () => {
  directory = await mkdtemp(join(tmpdir(), 'fieldbook-http2-'));
  const middleware = diagnosticsMiddleware(directory);
  drain = middleware.drain;
  server = createHttp2Server((req, res) =>
    middleware(req as unknown as IncomingMessage, res as unknown as ServerResponse, () =>
      res.end(),
    ),
  );
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  const base = `http://127.0.0.1:${address.port}`;
  const client = connect(base);
  async function post(path: string, body: string | Buffer, headers = {}) {
    const stream = client.request({ ':method': 'POST', ':path': path, origin: base, ...headers });
    let status: number | undefined;
    stream.on('response', (headers) => {
      status = headers[':status'];
    });
    stream.end(body);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return { status, body: JSON.parse(Buffer.concat(chunks).toString()) };
  }
  try {
    const logs = JSON.stringify({ events: [event] });
    expect(
      await post('/__fieldbook_debug/events', logs, { 'content-type': 'application/json' }),
    ).toEqual({ status: 200, body: { accepted: 1 } });
    const bytes = await readFile('tests/fixtures/arbutus-unedo.jpg');
    expect(
      await post('/__fieldbook_debug/photos/phone-photo', bytes, {
        'content-type': 'image/jpeg',
        'x-fieldbook-photo': encodeURIComponent(
          JSON.stringify({
            id: 'phone-photo',
            session: event.session,
            at: event.at,
            filename: 'phone.jpg',
          }),
        ),
      }),
    ).toEqual({ status: 200, body: { accepted: 'phone-photo' } });
    expect(await readFile(join(directory, 'photos/phone-photo.jpg'))).toEqual(bytes);
    expect(
      (
        await post('/__fieldbook_debug/events', logs, {
          'content-type': 'application/json',
          origin: 'https://unrelated.example',
        })
      ).status,
    ).toBe(403);
    await expect
      .poll(async () => {
        const lines = await readFile(join(directory, 'transport.jsonl'), 'utf8');
        return lines
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line).status);
      })
      .toEqual([200, 200, 403]);
  } finally {
    client.destroy();
  }
});

it('keeps complete sighting backups append-only and rejects invalid restore records', async () => {
  const base = await start();
  const endpoint = base + '/__fieldbook_debug/notebooks/device-1/encounter-1';
  const sighting = {
    id: 'encounter-1',
    taxonId: 82742,
    timestamp: Date.now(),
    lat: 37.18,
    lng: -8.6,
    accuracy: 8,
    cell: 'eyc8e',
    wasInCandidateSet: true,
    candidateSetAvailable: true,
    species: {
      id: 82742,
      scientificName: 'Ceratonia siliqua',
      commonName: 'Carob',
      group: 'plants',
      rank: 'species',
      alternativeNames: [],
    },
    photo:
      'data:image/jpeg;base64,' +
      (await readFile('tests/fixtures/arbutus-unedo.jpg')).toString('base64'),
  };
  const post = (value: unknown, origin = base) =>
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify(value),
    });
  expect((await post(sighting)).status).toBe(200);
  expect((await post({ ...sighting, photo: undefined })).status).toBe(200);
  expect(await (await fetch(endpoint)).json()).toEqual(sighting);
  expect(await (await fetch(base + '/__fieldbook_debug/notebooks/device-1')).json()).toEqual({
    ids: ['encounter-1'],
    retracted: [],
  });
  const retractedAt = Date.now();
  expect((await post({ ...sighting, retractedAt })).status).toBe(200);
  expect(await (await fetch(endpoint)).json()).toEqual({ ...sighting, retractedAt });
  expect(
    (await (await fetch(base + '/__fieldbook_debug/notebooks/device-1')).json()).retracted,
  ).toEqual(['encounter-1']);
  expect((await post([])).status).toBe(400);
  expect((await post({ ...sighting, lat: 999 })).status).toBe(400);
  expect((await post(sighting, 'https://unrelated.example')).status).toBe(403);
  expect((await fetch(endpoint, { method: 'DELETE' })).status).toBe(405);
  expect(
    JSON.parse(await readFile(join(directory, 'notebooks/device-1/encounter-1.json'), 'utf8')),
  ).toEqual(sighting);
});

it('accepts the native HTTPS origin and preflights while rejecting unrelated origins', async () => {
  const base = await start();
  const response = await fetch(base + '/__fieldbook_debug/status', {
    headers: { Origin: 'https://localhost' },
  });
  expect(response.status).toBe(200);
  expect(response.headers.get('access-control-allow-origin')).toBe('https://localhost');
  const preflight = await fetch(base + '/__fieldbook_debug/photos/photo-1', {
    method: 'OPTIONS',
    headers: { Origin: 'https://localhost', 'Access-Control-Request-Method': 'POST' },
  });
  expect(preflight.status).toBe(204);
  expect(
    (
      await fetch(base + '/__fieldbook_debug/status', {
        headers: { Origin: 'https://unrelated.example' },
      })
    ).status,
  ).toBe(403);
});
