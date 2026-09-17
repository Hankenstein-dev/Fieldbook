// Development benchmark only: never loaded by the app or supplied with its APK.
// node --env-file-if-exists=.env.local scripts/compare-plant-recognition.mjs plantnet
// Add --run to submit the listed photographs. Reuses completed comparisons.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const provider = process.argv[2];
if (!['plantnet', 'kindwise-trial'].includes(provider))
  throw new Error('Choose plantnet or kindwise-trial; add --run to submit the photographs.');
const run = process.argv.includes('--run');
const apiKey = process.env.PLANTNET_API_KEY?.trim();
if (run && provider === 'plantnet' && !apiKey)
  throw new Error('Set PLANTNET_API_KEY in the ignored .env.local file first.');
const controls = process.argv.includes('--controls');
let { cases } = JSON.parse(await readFile(path.join(root, 'config/recognition-field-tests.json')));
if (controls) {
  const samples = JSON.parse(
    await readFile(path.join(root, 'data/models/evaluation/results.json')),
  );
  const species = new Map(
    JSON.parse(await readFile(path.join(root, 'data/models/reference-species.json'))).map((s) => [
      s.id,
      s,
    ]),
  );
  cases = samples.map((sample) => ({
    id: `control-${sample.photo}`,
    files: [`data/models/evaluation/${sample.expected}-${sample.photo}.jpg`],
    expectedName: species.get(sample.expected).scientificName,
    labelStatus: 'source-labelled-control',
    sourceUrl: sample.url,
  }));
}
// This is a small comparison, not an unbounded batch or automatic retry loop.
if (cases.length > (controls ? 21 : 10))
  throw new Error('Evaluation exceeds the fixed request limit.');
const output = path.join(root, 'data/diagnostics/investigations/online-comparison');
if (run) await mkdir(output, { recursive: true });
for (const test of cases) {
  const files =
    test.files ??
    (test.photoIds ?? [test.photoId]).map((id) => `data/diagnostics/photos/${id}.jpg`);
  if (!files.length || files.length > 5)
    throw new Error('Each request needs one to five photos of the same plant.');
  const images = await Promise.all(files.map((file) => readFile(path.join(root, file))));
  const imageSha256 = createHash('sha256').update(Buffer.concat(images)).digest('hex');
  if (!run) {
    console.log(
      JSON.stringify({
        provider,
        case: test.id,
        bytes: images.reduce((sum, b) => sum + b.length, 0),
        imageSha256,
      }),
    );
    continue;
  }
  const resultPath = path.join(output, `${provider}-${test.id}.json`);
  const saved = await readFile(resultPath, 'utf8')
    .then(JSON.parse)
    .catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  if (saved) {
    if (saved.imageSha256 !== imageSha256)
      throw new Error(`Photo changed for ${test.id}; review the old comparison first.`);
    console.log(
      JSON.stringify({ case: test.id, reused: true, status: saved.status, seconds: saved.seconds }),
    );
    continue;
  }
  let url, body, headers;
  if (provider === 'plantnet') {
    url = new URL('https://my-api.plantnet.org/v2/identify/all');
    url.searchParams.set('api-key', apiKey);
    url.searchParams.set('nb-results', '10');
    body = new FormData();
    for (const bytes of images) {
      body.append('images', new Blob([bytes], { type: 'image/jpeg' }), 'plant.jpg');
      body.append('organs', 'auto');
    }
  } else {
    url = 'https://agents.kindwise.com/plant_id/identification';
    body = JSON.stringify({ images: images.map((bytes) => bytes.toString('base64')) });
    headers = { 'Content-Type': 'application/json' };
  }
  const started = performance.now();
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      body,
      headers,
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    // Never print the request URL (it contains the private Pl@ntNet key).
    throw new Error(`Request failed for ${test.id}; no automatic retry was made.`);
  }
  const data = await response.json().catch(() => ({}));
  const seconds = (performance.now() - started) / 1000;
  const top =
    provider === 'plantnet'
      ? (data.results ?? []).map((r) => ({
          name: r.species.scientificNameWithoutAuthor,
          score: r.score,
        }))
      : (data.result?.classification?.suggestions ?? []).map((r) => ({
          name: r.name,
          score: r.probability,
        }));
  const report = {
    provider,
    ...test,
    imageSha256,
    at: new Date().toISOString(),
    status: response.status,
    seconds,
    // Deliberately omit API keys, response access tokens, input image URLs and bytes.
    modelVersion: data.version ?? data.model_version,
    remainingRequests: data.remainingIdentificationRequests ?? data.quota_remaining,
    top,
  };
  await writeFile(resultPath, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify(report));
  // Includes quota failures. No paid fallback, account rotation, or retries.
  // A valid image rejected as non-plant is a measured control failure, not a
  // reason to skip the remaining independent controls or retry the same image.
  if ((!response.ok && !(controls && response.status === 404)) || report.remainingRequests === 0)
    break;
}
