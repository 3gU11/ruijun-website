$ErrorActionPreference = 'Stop'
$websiteRoot = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $websiteRoot '.env.local'

Get-Content -LiteralPath $environmentFile | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') {
    Set-Item -Path "Env:$($matches[1].Trim())" -Value $matches[2]
  }
}

$env:NITRO_HOST = '0.0.0.0'
$env:NITRO_PORT = '4175'
Set-Location $websiteRoot
node .output/server/index.mjs
