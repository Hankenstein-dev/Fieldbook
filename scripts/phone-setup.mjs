import { connectionScript } from './phone-network.mjs';
import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { isIPv4 } from 'node:net';

const address = process.argv[2];
if (!address || !isIPv4(address))
  throw new Error('Usage: npm run phone:setup -- <computer Wi-Fi IPv4 address>');
mkdirSync('.certs', { recursive: true, mode: 0o700 });
const openssl = (...args) => execFileSync('openssl', args, { stdio: ['ignore', 'pipe', 'pipe'] });
if (!existsSync('.certs/fieldbook-ca.crt')) {
  openssl(
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '3650',
    '-subj',
    '/CN=Fieldbook local testing CA',
    '-addext',
    'basicConstraints=critical,CA:TRUE',
    '-addext',
    'keyUsage=critical,keyCertSign,cRLSign',
    '-keyout',
    '.certs/ca-key.pem',
    '-out',
    '.certs/fieldbook-ca.crt',
  );
  chmodSync('.certs/ca-key.pem', 0o600);
}
openssl(
  'req',
  '-new',
  '-newkey',
  'rsa:2048',
  '-nodes',
  '-subj',
  '/CN=Fieldbook local testing',
  '-keyout',
  '.certs/server-key.pem',
  '-out',
  '.certs/server.csr',
);
chmodSync('.certs/server-key.pem', 0o600);
writeFileSync(
  '.certs/server.ext',
  `subjectAltName=DNS:localhost,IP:127.0.0.1,IP:${address}\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n`,
);
openssl(
  'x509',
  '-req',
  '-in',
  '.certs/server.csr',
  '-CA',
  '.certs/fieldbook-ca.crt',
  '-CAkey',
  '.certs/ca-key.pem',
  '-CAcreateserial',
  '-days',
  '365',
  '-extfile',
  '.certs/server.ext',
  '-out',
  '.certs/server.pem',
);
writeFileSync('.certs/phone.json', JSON.stringify({ address }, null, 2));
writeFileSync('.certs/connect-phone.ps1', connectionScript(address, process.env.WSL_DISTRO_NAME || 'Ubuntu'));
writeFileSync(
  '.certs/disconnect-phone.ps1',
  `# Run as administrator to remove Fieldbook's LAN access.
foreach ($fieldbookPort in @(5174, 5175)) {
  netsh interface portproxy delete v4tov4 listenaddress=${address} listenport=$fieldbookPort
}
Get-NetFirewallRule -Name 'FieldbookPhoneTesting' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
`,
);
console.log(
  `Prepared certificates for https://${address}:5174\nWindows setup: .certs/connect-phone.ps1 (administrator)\nStart: npm run phone\nCertificate download on phone: http://${address}:5175`,
);
