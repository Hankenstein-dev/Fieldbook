import { expect, it } from 'vitest';
import { encodeWebPhoto, decodeWebPhoto } from './webPhotos';

it('stores exact photo bytes without a Blob and reconstructs the original photo', async () => {
  const photo = new Blob([new Uint8Array([0, 255, 128, 7])], { type: 'image/jpeg' });
  const original = { id: 'encounter', photo, lat: 37.2, timestamp: 123456 };
  const stored = await encodeWebPhoto(original);
  expect(stored.photo).toBeUndefined();
  expect(stored.photoBytes).toBeInstanceOf(ArrayBuffer);
  const decoded = decodeWebPhoto(stored);
  expect(new Uint8Array(await decoded.photo.arrayBuffer())).toEqual(
    new Uint8Array([0, 255, 128, 7]),
  );
  expect(decoded.photo.type).toBe('image/jpeg');
  expect(decoded).toMatchObject({
    id: original.id,
    lat: original.lat,
    timestamp: original.timestamp,
  });
  expect(decoded).not.toHaveProperty('photoBytes');
  expect(original.photo).toBe(photo);
});

it('reads existing Blob records and records without photos without migration', () => {
  const legacy = { id: 'legacy', photo: new Blob(['old photo']) };
  expect(decodeWebPhoto(legacy)).toBe(legacy);
  const plain = { photo: undefined };
  expect(decodeWebPhoto(plain)).toBe(plain);
});
