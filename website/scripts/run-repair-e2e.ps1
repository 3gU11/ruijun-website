$ErrorActionPreference = 'Stop'
$websiteRoot = Split-Path -Parent $PSScriptRoot
$env:NITRO_HOST = '127.0.0.1'
$env:NITRO_PORT = '4174'
$env:REPAIRSYS_API_URL = 'http://127.0.0.1:3101/api'
$env:REPAIRSYS_HEALTH_URL = 'http://127.0.0.1:3101/api/health'
Set-Location $websiteRoot
node .output/server/index.mjs
