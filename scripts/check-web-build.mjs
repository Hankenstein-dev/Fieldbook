import { readdir, readFile, stat } from 'node:fs/promises';
import { loadEnv } from 'vite';

const root = 'dist-web';
const env = loadEnv('web', process.cwd(), '');
const privateKey = env.PLANTNET_API_KEY;
const approvedWebKey =
  env.PLANTNET_WEB_ENABLED === 'true' ? env.PLANTNET_WEB_API_KEY || privateKey : undefined;
let count = 0,
  bytes = 0;
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      if (
        ['models', 'runtime', 'recognition-downloads', 'data', '.certs', '.git'].includes(
          entry.name,
        )
      )
        throw new Error(`Unexpected hosted directory: ${path}`);
      await check(path);
    } else {
      const size = (await stat(path)).size;
      if (size > 25 * 1024 * 1024) throw new Error(`Asset exceeds the 25 MiB hosted-build budget: ${path}`);
      if (entry.name.startsWith('.env') || /\.(pem|key|apk)$/.test(entry.name))
        throw new Error(`Private file in hosted build: ${path}`);
      if (
        /\.(js|html|json)$/.test(entry.name) &&
        privateKey &&
        approvedWebKey !== privateKey &&
        (await readFile(path, 'utf8')).includes(privateKey)
      )
        throw new Error(
          'Android recognition key found in hosted build. Enable browser use explicitly before including it.',
        );
      count++;
      bytes += size;
    }
  }
}
await check(root);
if (count > 20000) throw new Error('Hosted build exceeds its 20,000-file budget.');
console.log(
  `Hosted build checked: ${count} files, ${(bytes / 1e6).toFixed(1)} MB; no offline model assets; recognition key inclusion checked against explicit browser opt-in.`,
);
if (!approvedWebKey)
  console.log(
    'Online recognition still needs PLANTNET_WEB_ENABLED=true and a browser-authorized Pl@ntNet key.',
  );
