import { identificationConfig as config } from '../../config/identification';
export async function photoTensor(blob: Blob): Promise<Float32Array> {
  const image = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const canvas = new OffscreenCanvas(config.imageSize, config.imageSize),
    ctx = canvas.getContext('2d')!;
  const side = Math.min(image.width, image.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    (image.width - side) / 2,
    (image.height - side) / 2,
    side,
    side,
    0,
    0,
    config.imageSize,
    config.imageSize,
  );
  image.close();
  const rgba = ctx.getImageData(0, 0, config.imageSize, config.imageSize).data,
    n = config.imageSize ** 2,
    out = new Float32Array(n * 3);
  for (let c = 0; c < 3; c++)
    for (let i = 0; i < n; i++)
      out[c * n + i] = (rgba[4 * i + c] / 255 - config.mean[c]) / config.std[c];
  return out;
}
export async function downscalePhoto(
  blob: Blob,
  dimensions?: (value: {
    width: number;
    height: number;
    outputWidth: number;
    outputHeight: number;
  }) => void,
) {
  const image = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
  const canvas = new OffscreenCanvas(
    Math.round(image.width * scale),
    Math.round(image.height * scale),
  );
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  dimensions?.({
    width: image.width,
    height: image.height,
    outputWidth: canvas.width,
    outputHeight: canvas.height,
  });
  image.close();
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
}
