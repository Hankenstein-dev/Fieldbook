import { palette } from '../../config/palette';
const colours = palette.map((hex) =>
  [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)),
);
// Pure pixel quantisation. Image loading and canvas allocation stay outside this function.
export function pixelate(input: Uint8ClampedArray): Uint8ClampedArray {
  const output = new Uint8ClampedArray(input);
  for (let i = 0; i < input.length; i += 4) {
    let best = colours[0],
      distance = Infinity;
    for (const colour of colours) {
      const d =
        2 * (input[i] - colour[0]) ** 2 +
        4 * (input[i + 1] - colour[1]) ** 2 +
        (input[i + 2] - colour[2]) ** 2;
      if (d < distance) {
        best = colour;
        distance = d;
      }
    }
    output[i] = best[0];
    output[i + 1] = best[1];
    output[i + 2] = best[2];
  }
  return output;
}
