import { afterEach, describe, expect, it, vi } from 'vitest';
import { gzipSync } from 'node:zlib';
import { fetchRecognitionAsset } from './recognitionDownload';

const fixture = vi.hoisted(() => ({ text: 'A small recognition asset for transport tests.' }));
vi.mock('../../config/generated/recognition-downloads.json', async () => {
  const { createHash } = await import('node:crypto');
  return {
    default: {
      files: {
        '/fixture.bin': {
          url: '/recognition-downloads/fixture.gz',
          bytes: fixture.text.length,
          downloadBytes: 64,
          sha256: createHash('sha256').update(fixture.text).digest('hex'),
        },
      },
    },
  };
});
afterEach(() => vi.unstubAllGlobals());

describe('recognition download transport', () => {
  it('unpacks gzip to the original bytes and avoids an extra HTTP cache copy', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(gzipSync(fixture.text)));
    vi.stubGlobal('fetch', fetcher);
    expect(await (await fetchRecognitionAsset('/fixture.bin')).text()).toBe(fixture.text);
    expect(fetcher).toHaveBeenCalledWith('/recognition-downloads/fixture.gz', {
      signal: undefined,
      cache: 'no-store',
    });
  });
  it('accepts a host that already decoded gzip through Content-Encoding', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(fixture.text)));
    expect(await (await fetchRecognitionAsset('/fixture.bin')).text()).toBe(fixture.text);
  });
  it('rejects changed content even when it has the expected length', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(gzipSync('X'.repeat(fixture.text.length)))),
    );
    await expect(fetchRecognitionAsset('/fixture.bin')).rejects.toThrow('integrity check failed');
  });
  it('rejects a truncated compressed response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(gzipSync(fixture.text).subarray(0, 12))),
    );
    await expect(fetchRecognitionAsset('/fixture.bin')).rejects.toThrow();
  });
  it('does not start a cancelled download or return bytes after cancellation', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.resolve(new Response(gzipSync(fixture.text)));
    });
    vi.stubGlobal('fetch', fetcher);
    await expect(fetchRecognitionAsset('/fixture.bin', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    await expect(fetchRecognitionAsset('/fixture.bin', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('reports failed HTTP downloads without accepting their response body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 })));
    await expect(fetchRecognitionAsset('/fixture.bin')).rejects.toThrow('tap download to resume');
  });
});
