$ErrorActionPreference = 'Stop'
$cmsRoot = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $cmsRoot '.env.local'

Get-Content -LiteralPath $environmentFile | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') {
    Set-Item -Path "Env:$($matches[1].Trim())" -Value $matches[2]
  }
}

Set-Location $cmsRoot
npx --yes node@22 node_modules/directus/cli.js start
