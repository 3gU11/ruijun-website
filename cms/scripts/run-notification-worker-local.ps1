$ErrorActionPreference = 'Stop'
$cmsRoot = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $cmsRoot '.env.local'

Get-Content -LiteralPath $environmentFile | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') {
    Set-Item -Path "Env:$($matches[1].Trim())" -Value $matches[2]
  }
}

Push-Location $cmsRoot
try {
  npx --yes node@22 ./scripts/run-lead-notification-worker.mjs
} finally {
  Pop-Location
}
