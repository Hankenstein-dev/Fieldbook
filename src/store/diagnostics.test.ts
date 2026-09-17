import { describe, expect, it } from 'vitest';
import {
  saveDiagnostic,
  readDiagnostics,
  pendingDiagnostics,
  markDiagnosticsSent,
  saveDiagnosticPhoto,
  readDiagnosticPhotos,
  pendingDiagnosticPhoto,
  markDiagnosticPhotoSent,
} from './diagnostics';

describe('diagnostic retention and acknowledgement', () => {
  it('keeps a bounded independent journal and retains unacknowledged events', async () => {
    for (let i = 0; i < 1002; i++)
      await saveDiagnostic({
        id: `event-${i.toString().padStart(4, '0')}`,
        session: 'phone-session',
        at: new Date(1700000000000 + i).toISOString(),
        event: 'photo.selected',
        level: 'info',
        details: { filename: `plant-${i}.jpg` },
      });
    const events = await readDiagnostics();
    expect(events).toHaveLength(1000);
    expect(events[0].id).toBe('event-0002');
    const pending = await pendingDiagnostics();
    expect(pending).toHaveLength(20);
    // Failed or absent delivery does not remove pending records.
    expect(await pendingDiagnostics()).toEqual(pending);
    await markDiagnosticsSent(pending.map((e) => e.id));
    expect((await pendingDiagnostics()).some((e) => pending.some((p) => p.id === e.id))).toBe(
      false,
    );
    expect(await readDiagnostics()).toHaveLength(1000);
  });
});
it('retains rejected photos independently, evicts oldest at the cap, and only acknowledges delivered photos', async () => {
  for (let i = 0; i < 102; i++)
    await saveDiagnosticPhoto({
      id: `photo-${i}`,
      session: 'phone',
      at: new Date(1700000000000 + i).toISOString(),
      filename: `plant-${i}.jpg`,
      photo: new Blob(['test'], { type: 'image/jpeg' }),
      sent: 0,
    });
  expect(await readDiagnosticPhotos()).toHaveLength(100);
  const first = await pendingDiagnosticPhoto();
  expect(first?.id).toBe('photo-2');
  expect(await first?.photo.text()).toBe('test');
  await markDiagnosticPhotoSent(first!.id);
  expect((await pendingDiagnosticPhoto())?.id).toBe('photo-3');
  expect(await readDiagnosticPhotos()).toHaveLength(100);
});
