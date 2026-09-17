import { isIPv4 } from 'node:net';

export function connectionScript(address, distro) {
  if (!isIPv4(address)) throw new Error('Expected a Wi-Fi IPv4 address');
  const distribution = distro.replaceAll("'", "''");
  return `# Run in Windows PowerShell as administrator. Re-run after WSL restarts.
# Only Fieldbook's two forwarding entries and its local-subnet firewall rule are changed.
$ErrorActionPreference = 'Stop'
$fieldbookLog = Join-Path $PSScriptRoot 'phone-connection.log'
Start-Transcript -Path $fieldbookLog -Force | Out-Null
try {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  if (-not ([Security.Principal.WindowsPrincipal]$identity).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Windows administrator access is required to restore phone networking.' }
  $fieldbookIp = ((wsl.exe -d '${distribution}' hostname -I).Trim() -split '\\s+')[0]
  if ($fieldbookIp -notmatch '^\\d+\\.\\d+\\.\\d+\\.\\d+$') { throw 'Could not find WSL IPv4 address.' }
  $fieldbookEndpoint = 'https://${address}:5174/__fieldbook_debug/status'
  # Test the target first: a running rule cannot fix a stopped server.
  $fieldbookTarget = & curl.exe -k -sS --connect-timeout 3 --max-time 5 "https://\${fieldbookIp}:5174/__fieldbook_debug/status"
  if ($LASTEXITCODE -ne 0 -or $fieldbookTarget -notmatch '"fieldbookDiagnostics":true') { throw 'Start npm run phone before connecting the phone.' }
  Start-Service iphlpsvc
  foreach ($fieldbookPort in @(5174, 5175)) {
    # Replacing an existing rule with identical values can leave a stale listener.
    netsh interface portproxy delete v4tov4 listenaddress=${address} listenport=$fieldbookPort | Out-Null
    netsh interface portproxy add v4tov4 listenaddress=${address} listenport=$fieldbookPort connectaddress=$fieldbookIp connectport=$fieldbookPort
    if ($LASTEXITCODE -ne 0) { throw 'Port forwarding failed.' }
  }
  Get-NetFirewallRule -Name 'FieldbookPhoneTesting' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  New-NetFirewallRule -Name 'FieldbookPhoneTesting' -DisplayName 'Fieldbook phone testing (local subnet)' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5174,5175 -LocalAddress ${address} -RemoteAddress LocalSubnet -Profile Any | Out-Null
  $fieldbookListening = $false
  for ($fieldbookAttempt = 0; $fieldbookAttempt -lt 5; $fieldbookAttempt++) {
    if (Get-NetTCPConnection -State Listen -LocalAddress '${address}' -LocalPort 5174 -ErrorAction SilentlyContinue) { $fieldbookListening = $true; break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $fieldbookListening) {
    Write-Host 'Forwarding rules exist but Windows has no listener; restarting IP Helper.'
    Restart-Service iphlpsvc -Force
    Start-Sleep -Seconds 2
  }
  $fieldbookStatus = & curl.exe -k -sS --connect-timeout 3 --max-time 5 $fieldbookEndpoint
  if ($LASTEXITCODE -ne 0 -or $fieldbookStatus -notmatch '"fieldbookDiagnostics":true') { throw 'Phone forwarding is still unreachable. See phone-connection.log.' }
  Write-Host 'Verified phone connection: https://${address}:5174'
  Write-Host 'Android update: https://${address}:5174/__fieldbook_debug/android'
} finally { Stop-Transcript | Out-Null }
`;
}
