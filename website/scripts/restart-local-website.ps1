$ErrorActionPreference = 'Stop'

$websiteRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = Split-Path -Parent $websiteRoot
$nodePath = Join-Path $workspaceRoot 'cms\.tools\node-v22.23.2-win-x64\node.exe'
$nuxtEntry = Join-Path $websiteRoot 'node_modules\@nuxt\cli\bin\nuxi.mjs'
$stdout = Join-Path $websiteRoot '.codex-nuxt-4175.stdout.log'
$stderr = Join-Path $websiteRoot '.codex-nuxt-4175.stderr.log'

if (-not (Test-Path -LiteralPath $nodePath)) { throw "Bundled Node runtime was not found: $nodePath" }
if (-not (Test-Path -LiteralPath $nuxtEntry)) { throw "Nuxt CLI entry was not found: $nuxtEntry" }

$listener = Get-NetTCPConnection -LocalPort 4175 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
  if (-not $process.CommandLine -or $process.CommandLine -notmatch '(@nuxt[\\/]cli|nuxt.*dev)') {
    throw "Port 4175 is owned by an unexpected process (PID $($listener.OwningProcess)); refusing to stop it."
  }
  Stop-Process -Id $listener.OwningProcess -Force
  Start-Sleep -Milliseconds 800
}

Start-Process -FilePath $nodePath `
  -ArgumentList @('--enable-source-maps', $nuxtEntry, 'dev', '--force', '--dotenv', '.env.local', '--host', '0.0.0.0', '--port', '4175') `
  -WorkingDirectory $websiteRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr

$deadline = (Get-Date).AddSeconds(45)
do {
  Start-Sleep -Milliseconds 500
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4175' -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      Write-Output '{"restarted":true,"healthy":true}'
      exit 0
    }
  } catch {
    # The development server is still starting.
  }
} while ((Get-Date) -lt $deadline)

throw "Nuxt did not become healthy within 45 seconds. See $stderr"
