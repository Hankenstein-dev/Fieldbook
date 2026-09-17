import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const { address } = JSON.parse(readFileSync('.certs/phone.json', 'utf8'));
const certificate = readFileSync('.certs/fieldbook-ca.crt');
// Bootstrap endpoint serves only the PUBLIC CA certificate, never the project directory.
const bootstrap = createServer((_request, response) => {
  response.writeHead(200, {
    'Content-Type': 'application/x-x509-ca-cert',
    'Content-Disposition': 'attachment; filename="fieldbook-ca.crt"',
    'Cache-Control': 'no-store',
  });
  response.end(certificate);
});
const child = spawn(
  'node',
  ['node_modules/vite/bin/vite.js', 'preview', '--host', '0.0.0.0', '--mode', 'phone'],
  { stdio: 'inherit' },
);
bootstrap.on('error', (error) => {
  console.error(error);
  child.kill();
  process.exitCode = 1;
});
bootstrap.listen(5175, '0.0.0.0', () =>
  console.log(
    `Phone certificate: http://${address}:5175\nPhone app: https://${address}:5174\nDesktop logs: http://localhost:5173/__fieldbook_debug`,
  ),
);
const close = () => {
  bootstrap.close();
  child.kill();
};
process.on('SIGINT', close);
process.on('SIGTERM', close);
child.on('exit', (code) => {
  bootstrap.close();
  process.exitCode = code ?? 0;
});
