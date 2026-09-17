import { mkdir, readFile, appendFile, rename, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Connect, Plugin } from 'vite';
import type { DiagnosticEvent } from '../src/diagnostics/types.ts';
import { photoRequest } from './diagnostic-photos.ts';
import { updatePage } from './diagnostic-update.ts';
import { sightingBackupRequest } from './sighting-backups.ts';

const viewer = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Fieldbook diagnostics</title>
<style>body{font:15px system-ui;margin:2rem;background:#f5f3e9;color:#203d30}header{position:sticky;top:0;background:#f5f3e9;padding:1rem 0}input{padding:.6rem;width:24rem;max-width:90%}article{border-top:1px solid #ccc;padding:.7rem 0}pre{white-space:pre-wrap;overflow-wrap:anywhere}.error{color:#a02121}.warn{color:#815d09}small{color:#57685e}</style>
<header><h1>Fieldbook diagnostics</h1><p>Phone and desktop sessions · refreshes every two seconds · photos, results and errors</p><input id="filter" placeholder="Filter by session, filename, event or error" aria-label="Filter logs"><p id="status">Connecting…</p></header><details><summary>Received photos</summary><div id="photos"></div></details><main id="events"></main>
<script>
const filter=document.getElementById('filter'), list=document.getElementById('events'), status=document.getElementById('status'); let rows=[], photos=[], signature="";
function render(){const q=filter.value.toLowerCase();list.replaceChildren();const seen=new Set();for(const e of [...rows].reverse()){if(seen.has(e.id))continue;seen.add(e.id);if(!JSON.stringify(e).toLowerCase().includes(q))continue;const a=document.createElement('article');a.className=e.level;const h=document.createElement('strong');h.textContent=e.event;const s=document.createElement('small');s.textContent=' · '+e.at+' · session '+e.session;const p=document.createElement('pre');p.textContent=JSON.stringify(e.details,null,2);a.append(h,s,p);const ids=[e.details.photoId,...(Array.isArray(e.details.photos)?e.details.photos.map(p=>p.id):[])].filter(id=>photos.some(p=>p.id===id));for(const id of ids){const link=document.createElement('a');link.href='/__fieldbook_debug/photos/'+encodeURIComponent(id);link.target='_blank';const img=document.createElement('img');img.src=link.href;img.alt='Identification photo';img.width=160;img.loading='lazy';link.append(img);a.append(link);}list.append(a);}}
async function refresh(){try{const r=await fetch('/__fieldbook_debug/events',{cache:'no-store'});if(!r.ok)throw Error('Server unavailable');rows=(await r.json()).sort((a,b)=>a.at.localeCompare(b.at));const pr=await fetch('/__fieldbook_debug/photos',{cache:'no-store'});if(!pr.ok)throw Error('Photos unavailable');photos=await pr.json();status.textContent=rows.length+' recent events · '+new Date().toLocaleTimeString();const next=JSON.stringify([rows,photos]);if(next!==signature){signature=next;render();const gallery=document.getElementById('photos');gallery.replaceChildren();for(const photo of photos){const figure=document.createElement('figure'),link=document.createElement('a'),img=document.createElement('img'),caption=document.createElement('figcaption');link.href='/__fieldbook_debug/photos/'+encodeURIComponent(photo.id);link.target='_blank';img.src=link.href;img.alt=photo.filename;img.width=160;img.loading='lazy';link.append(img);caption.textContent=photo.filename+' · '+photo.at+' · '+photo.id;figure.append(link,caption);gallery.append(figure);}}}catch{status.textContent='Cannot reach the computer. Retrying…';}}
filter.addEventListener('input',render);refresh();setInterval(refresh,2000);
</script></html>`;

export function validEvents(value: unknown): value is { events: DiagnosticEvent[] } {
  if (!value || typeof value !== 'object' || !('events' in value)) return false;
  const events = value.events;
  return (
    Array.isArray(events) &&
    events.length > 0 &&
    events.length <= 20 &&
    events.every(
      (e) =>
        e &&
        typeof e === 'object' &&
        typeof e.id === 'string' &&
        /^[\w-]{1,80}$/.test(e.id) &&
        typeof e.session === 'string' &&
        /^[\w-]{1,80}$/.test(e.session) &&
        typeof e.at === 'string' &&
        e.at.length < 40 &&
        Number.isFinite(Date.parse(e.at)) &&
        ['info', 'warn', 'error'].includes(e.level) &&
        typeof e.event === 'string' &&
        e.event.length <= 100 &&
        e.details &&
        typeof e.details === 'object' &&
        !Array.isArray(e.details) &&
        JSON.stringify(e.details).length <= 13000,
    )
  );
}

export function diagnosticsMiddleware(directory: string) {
  const file = resolve(directory, 'events.jsonl');
  let writes = Promise.resolve();
  let transportWrites = Promise.resolve();
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const path = req.url?.split('?')[0];
    if (!path?.startsWith('/__fieldbook_debug')) return next();
    // Node's HTTP/2 compatibility requests use :authority instead of Host.
    const authority = req.headers[':authority'] ?? req.headers.host;
    const started = Date.now();
    res.once('finish', () => {
      if (
        req.method !== 'POST' &&
        path !== '/__fieldbook_debug/status' &&
        path !== '/__fieldbook_debug/update' &&
        path !== '/__fieldbook_debug/update.html' &&
        res.statusCode < 400
      )
        return;
      const line =
        JSON.stringify({
          at: new Date().toISOString(),
          method: req.method,
          path: path.slice(0, 200),
          status: res.statusCode,
          milliseconds: Date.now() - started,
          host: authority,
          origin: req.headers.origin,
          userAgent: req.headers['user-agent']?.slice(0, 500),
        }) + '\n';
      transportWrites = transportWrites
        .then(async () => {
          await mkdir(directory, { recursive: true });
          const transport = resolve(directory, 'transport.jsonl');
          const size = await stat(transport)
            .then((s) => s.size)
            .catch(() => 0);
          if (size > 1_000_000) await rename(transport, transport + '.1');
          await appendFile(transport, line);
        })
        .catch((error) => console.error('[Fieldbook receiver] Request journal failed', error));
    });
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (code: number, body: unknown) => {
      res.statusCode = code;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    };
    const nativeOrigin = req.headers.origin === 'https://localhost';
    if (nativeOrigin) {
      res.setHeader('Access-Control-Allow-Origin', 'https://localhost');
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Fieldbook-Photo');
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
    }
    if (req.headers.origin && !nativeOrigin) {
      try {
        if (new URL(req.headers.origin).host !== authority)
          return reply(403, { error: 'Origin rejected' });
      } catch {
        return reply(403, { error: 'Origin rejected' });
      }
    }
    void (async () => {
      if (req.method === 'GET' && path === '/__fieldbook_debug/android') {
        let apk: Buffer;
        try {
          apk = await readFile(resolve('android/app/build/outputs/apk/debug/app-debug.apk'));
        } catch {
          return reply(404, { error: 'Build the Android APK with npm run android:build first.' });
        }
        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', 'attachment; filename="Fieldbook.apk"');
        res.setHeader('Content-Length', apk.length);
        res.end(apk);
        return;
      }
      if (req.method === 'GET' && path === '/__fieldbook_debug/status')
        return reply(200, { fieldbookDiagnostics: true, photoUpload: true, sightingBackup: true });
      if (req.method === 'GET' && ['/__fieldbook_debug/update', '/__fieldbook_debug/update.html'].includes(path)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(updatePage);
        return;
      }
      if (await photoRequest(req, res, path, directory)) return;
      if (await sightingBackupRequest(req, res, path, directory)) return;
      if (req.method === 'GET' && path === '/__fieldbook_debug') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(viewer);
        return;
      }
      if (req.method === 'GET' && path === '/__fieldbook_debug/events') {
        await writes;
        let data = '';
        try {
          data = await readFile(file, 'utf8');
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
        }
        return reply(
          200,
          data
            .trim()
            .split('\n')
            .filter(Boolean)
            .slice(-1000)
            .flatMap((line) => {
              try {
                return [JSON.parse(line)];
              } catch {
                return [];
              }
            }),
        );
      }
      if (req.method !== 'POST' || path !== '/__fieldbook_debug/events')
        return reply(404, { error: 'Not found' });
      if (!req.headers['content-type']?.startsWith('application/json'))
        return reply(415, { error: 'JSON required' });
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 300_000) return reply(413, { error: 'Batch too large' });
        chunks.push(Buffer.from(chunk));
      }
      let body: unknown;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        return reply(400, { error: 'Invalid JSON' });
      }
      if (!validEvents(body)) return reply(400, { error: 'Invalid events' });
      // Whitelist fields; never store arbitrary top-level request data.
      const lines =
        body.events
          .map(({ id, session, at, level, event, details }) =>
            JSON.stringify({
              id,
              session,
              at,
              level,
              event,
              details,
              receivedAt: new Date().toISOString(),
            }),
          )
          .join('\n') + '\n';
      const write = writes.then(async () => {
        await mkdir(directory, { recursive: true });
        const bytes = await stat(file)
          .then((s) => s.size)
          .catch(() => 0);
        if (bytes + Buffer.byteLength(lines) > 5_000_000) await rename(file, file + '.1');
        await appendFile(file, lines);
        // Keep complete developer sessions alongside the bounded live-view journal.
        const sessions = resolve(directory, 'sessions');
        await mkdir(sessions, { recursive: true });
        const grouped = new Map<string, string[]>();
        for (const line of lines.trim().split('\n')) {
          const event = JSON.parse(line);
          const rows = grouped.get(event.session) ?? [];
          rows.push(line);
          grouped.set(event.session, rows);
        }
        for (const [session, rows] of grouped)
          await appendFile(resolve(sessions, `${session}.jsonl`), rows.join('\n') + '\n');
      });
      writes = write.catch(() => undefined);
      await write;
      reply(200, { accepted: body.events.length });
    })().catch((error) => {
      console.error('[Fieldbook receiver]', req.method, path, error);
      reply(500, { error: 'Could not store diagnostics' });
    });
  };
  return Object.assign(middleware, {
    drain: async () => {
      await writes;
      await transportWrites;
    },
  });
}

export function diagnosticsPlugin(): Plugin {
  const middleware = diagnosticsMiddleware(resolve('data/diagnostics'));
  return {
    name: 'fieldbook-local-diagnostics',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
