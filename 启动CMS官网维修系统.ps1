[CmdletBinding()]
param(
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$outputRoot = Join-Path $root 'output\launcher'
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

function Test-LocalPort {
  param([int]$Port)
  return [bool](Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
}

function Get-LanIPv4Address {
  $route = Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
    Sort-Object RouteMetric, InterfaceMetric |
    Select-Object -First 1
  if (-not $route) { return $null }
  return Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $route.InterfaceIndex -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
    Select-Object -First 1 -ExpandProperty IPAddress
}

function Start-ServiceWindow {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Command
  )

  $logName = ($Name -replace '[^A-Za-z0-9]+', '-').Trim('-').ToLowerInvariant()
  $stdout = Join-Path $outputRoot "$logName.stdout.log"
  $stderr = Join-Path $outputRoot "$logName.stderr.log"
  $arguments = "-NoProfile -ExecutionPolicy Bypass -Command `"Set-Location -LiteralPath '$WorkingDirectory'; $Command`""
  Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -WorkingDirectory $WorkingDirectory -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr | Out-Null
}

function Start-IfStopped {
  param(
    [string]$Name,
    [int]$Port,
    [string]$WorkingDirectory,
    [string]$Command
  )

  if (Test-LocalPort -Port $Port) {
    Write-Host "[Already running] $Name : $Port" -ForegroundColor Yellow
    return
  }

  Write-Host "[Starting] $Name : $Port" -ForegroundColor Cyan
  Start-ServiceWindow -Name $Name -WorkingDirectory $WorkingDirectory -Command $Command
}

function Clear-StaleNuxtDevLock {
  param(
    [string]$WebsiteRoot,
    [int]$Port
  )

  # Nuxt agent-mode locks can outlive the actual dev server when its console
  # process remains alive. Only touch this project's lock after confirming the
  # requested website port has no listener; never terminate the recorded PID.
  if (Test-LocalPort -Port $Port) { return }

  $lockPath = Join-Path $WebsiteRoot '.nuxt\nuxt.lock'
  if (-not (Test-Path -LiteralPath $lockPath)) { return }

  $lockInfo = $null
  try {
    $lockInfo = Get-Content -LiteralPath $lockPath -Raw | ConvertFrom-Json
  }
  catch {
    # A malformed lock is not a running website and is safe to remove here.
  }

  if ($lockInfo -and $lockInfo.pid -and (Get-Process -Id $lockInfo.pid -ErrorAction SilentlyContinue)) {
    Write-Host "[Clearing] Nuxt dev lock is still owned by a live process, but website port $Port is not listening." -ForegroundColor Yellow
  }
  else {
    Write-Host "[Clearing] Stale Nuxt dev lock for website port $Port." -ForegroundColor Yellow
  }
  Remove-Item -LiteralPath $lockPath -Force
}

function Wait-Service {
  param(
    [string]$Name,
    [int]$Port,
    [string]$HealthUrl,
    [int]$TimeoutSeconds = 90
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-LocalPort -Port $Port) {
      try {
        $response = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
          Write-Host "[Ready] $Name : $Port" -ForegroundColor Green
          return $true
        }
      }
      catch {
        # The port can start listening before the application is ready to serve requests.
      }
    }
    Start-Sleep -Seconds 1
  }

  Write-Warning "$Name did not become healthy at $HealthUrl within $TimeoutSeconds seconds. Check its PowerShell window."
  return $false
}

function Wait-MySql {
  param(
    [string]$AdminPath,
    [string]$DefaultsFile,
    [int]$TimeoutSeconds = 90
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-LocalPort -Port 3307) {
      & $AdminPath --defaults-file=$DefaultsFile --host=127.0.0.1 ping --silent 2>$null
      if ($LASTEXITCODE -eq 0) {
        Write-Host '[Ready] MySQL : 3307' -ForegroundColor Green
        return $true
      }
    }
    Start-Sleep -Seconds 1
  }

  Write-Warning "MySQL did not become healthy on port 3307 within $TimeoutSeconds seconds."
  return $false
}

$cmsRoot = Join-Path $root 'cms'
$websiteRoot = Join-Path $root 'website'
$repairRoot = Join-Path $root 'repairsys'
$cmsNode = Join-Path $cmsRoot '.tools\node-v22.23.2-win-x64\node.exe'
$projectNpm = Join-Path $cmsRoot '.tools\node-v22.23.2-win-x64\npm.cmd'
$projectNodeBin = Split-Path -Parent $cmsNode
$directusCli = Join-Path $cmsRoot 'node_modules\directus\cli.js'
$cmsEnv = Join-Path $cmsRoot '.env.local'
$mysqlIni = Join-Path $cmsRoot 'mysql-cms.ini'
$minioExe = Join-Path $root 'tools\minio.exe'
$minioData = Join-Path $cmsRoot 'minio-data'
$websitePackage = Join-Path $websiteRoot 'package.json'
$repairPackage = Join-Path $repairRoot 'package.json'
$repairEnv = Join-Path $repairRoot '.env'
$workbenchRoot = Join-Path $cmsRoot 'extensions\\content-editor-workbench'
$workbenchDist = Join-Path $workbenchRoot 'dist\\index.js'
$workbenchSourceRoot = Join-Path $workbenchRoot 'src'
$lanAddress = Get-LanIPv4Address
if (-not $lanAddress) {
  $lanAddress = '127.0.0.1'
  Write-Warning 'No LAN IPv4 address was found. Local preview will use 127.0.0.1 only.'
}

foreach ($path in @($cmsRoot, $websiteRoot, $repairRoot, $cmsNode, $projectNpm, $directusCli, $cmsEnv, $mysqlIni, $minioExe, $websitePackage, $repairPackage, $repairEnv, $workbenchRoot, $workbenchSourceRoot)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Required startup path is missing: $path"
  }
}

$mysqlBaseDirLine = Get-Content -LiteralPath $mysqlIni | Where-Object { $_ -match '^basedir=(.+)$' } | Select-Object -First 1
if (-not $mysqlBaseDirLine -or $mysqlBaseDirLine -notmatch '^basedir=(.+)$') {
  throw "MySQL basedir is missing from $mysqlIni"
}
$mysqlBaseDir = $matches[1].Trim().Replace('/', '\')
$mysqlExe = Join-Path $mysqlBaseDir 'bin\mysqld.exe'
$mysqlAdmin = Join-Path $mysqlBaseDir 'bin\mysqladmin.exe'
foreach ($path in @($mysqlExe, $mysqlAdmin)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Required MySQL binary is missing: $path"
  }
}

$mysqlCommand = "& '$mysqlExe' --defaults-file='$mysqlIni' --console"
Start-IfStopped -Name 'MySQL' -Port 3307 -WorkingDirectory $cmsRoot -Command $mysqlCommand
$mysqlReady = Wait-MySql -AdminPath $mysqlAdmin -DefaultsFile $mysqlIni
if (-not $mysqlReady) {
  throw 'CMS startup stopped because MySQL is unavailable.'
}

$minioCommand = @"
Get-Content -LiteralPath '.env.local' | ForEach-Object { if (`$_ -match '^([^#=]+)=(.*)$') { Set-Item -Path "Env:`$(`$matches[1].Trim())" -Value `$matches[2] } }
if (-not `$env:STORAGE_S3_KEY -or -not `$env:STORAGE_S3_SECRET) { throw 'MinIO credentials are missing from .env.local' }
Set-Item -Path 'Env:MINIO_ROOT_USER' -Value `$env:STORAGE_S3_KEY
Set-Item -Path 'Env:MINIO_ROOT_PASSWORD' -Value `$env:STORAGE_S3_SECRET
& '$minioExe' server '$minioData' --address '127.0.0.1:9000' --console-address '127.0.0.1:9001'
"@
Start-IfStopped -Name 'MinIO' -Port 9000 -WorkingDirectory $cmsRoot -Command $minioCommand
$minioReady = Wait-Service -Name 'MinIO' -Port 9000 -HealthUrl 'http://127.0.0.1:9000/minio/health/ready'
if (-not $minioReady) {
  throw 'CMS startup stopped because MinIO is unavailable.'
}

# Directus loads compiled extensions from dist/. Rebuild only when source files
# are newer, and reload the listener so a rerun cannot keep serving stale UI.
$workbenchNeedsBuild = -not (Test-Path -LiteralPath $workbenchDist)
if (-not $workbenchNeedsBuild) {
  $latestWorkbenchSource = Get-ChildItem -LiteralPath $workbenchSourceRoot -Recurse -File |
    Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
  $workbenchNeedsBuild = $latestWorkbenchSource -and ($latestWorkbenchSource.LastWriteTimeUtc -gt (Get-Item -LiteralPath $workbenchDist).LastWriteTimeUtc)
}
$workbenchRebuilt = $false
if ($workbenchNeedsBuild) {
  Write-Host '[Building] Directus content editor extension' -ForegroundColor Cyan
  Push-Location $workbenchRoot
  try {
    & $projectNpm run build
    if ($LASTEXITCODE -ne 0) { throw 'Content editor extension build failed.' }
    $workbenchRebuilt = $true
  }
  finally {
    Pop-Location
  }
}
if ($workbenchRebuilt -and (Test-LocalPort -Port 8055)) {
  $directusListener = Get-NetTCPConnection -State Listen -LocalPort 8055 -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($directusListener) {
    Write-Host '[Reloading] CMS (Directus) after extension build' -ForegroundColor Yellow
    Stop-Process -Id $directusListener.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
  }
}

$cmsCommand = @"
Get-Content -LiteralPath '.env.local' | ForEach-Object { if (`$_ -match '^([^#=]+)=(.*)$') { Set-Item -Path "Env:`$(`$matches[1].Trim())" -Value `$matches[2] } }
Set-Item -Path 'Env:PUBLIC_URL' -Value 'http://$lanAddress`:8055'
Set-Item -Path 'Env:WEBSITE_PREVIEW_OPEN_URL' -Value 'http://$lanAddress`:4175/api/preview/open'
Set-Item -Path 'Env:WEBSITE_PREVIEW_ALLOWED_HOSTS' -Value '127.0.0.1,$lanAddress'
Set-Item -Path 'Env:CONTENT_SECURITY_POLICY_DIRECTIVES__CHILD_SRC' -Value "array:http://127.0.0.1:8055,http://$lanAddress`:8055,http://127.0.0.1:4175,http://$lanAddress`:4175,blob:"
Set-Item -Path 'Env:CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_SRC' -Value "array:http://127.0.0.1:8055,http://$lanAddress`:8055,http://127.0.0.1:4175,http://$lanAddress`:4175,blob:"
Set-Item -Path 'Env:CONTENT_SECURITY_POLICY_DIRECTIVES__FORM_ACTION' -Value "array:'self',http://127.0.0.1:4175,http://$lanAddress`:4175"
& '$cmsNode' '$directusCli' start
"@
Start-IfStopped -Name 'CMS (Directus)' -Port 8055 -WorkingDirectory $cmsRoot -Command $cmsCommand
$cmsReady = Wait-Service -Name 'CMS (Directus)' -Port 8055 -HealthUrl 'http://127.0.0.1:8055/server/health'

$nodePathCommand = "`$env:Path = '$projectNodeBin;' + `$env:Path"
$websiteCommand = "$nodePathCommand; Set-Item -Path 'Env:NUXT_PUBLIC_CMS_PREVIEW_ORIGINS' -Value 'http://127.0.0.1:8055,http://$lanAddress`:8055'; & '$projectNpm' run dev -- --force --dotenv .env.local --host 0.0.0.0 --port 4175"
Clear-StaleNuxtDevLock -WebsiteRoot $websiteRoot -Port 4175
Start-IfStopped -Name 'Website (Nuxt)' -Port 4175 -WorkingDirectory $websiteRoot -Command $websiteCommand
$repairEnvLoader = 'Get-Content -LiteralPath ''.env'' | ForEach-Object { if ($_ -match ''^([^#=]+)=(.*)$'') { Set-Item -Path "Env:$($matches[1].Trim())" -Value $matches[2] } }'
$repairApiCommand = "$nodePathCommand; $repairEnvLoader; & '$projectNpm' run dev:api"
$repairAdminCommand = "$nodePathCommand; $repairEnvLoader; & '$projectNpm' run dev:admin"
$repairClientCommand = "$nodePathCommand; $repairEnvLoader; & '$projectNpm' run dev:client"
Start-IfStopped -Name 'Repair API' -Port 3101 -WorkingDirectory $repairRoot -Command $repairApiCommand
$repairApiReady = Wait-Service -Name 'Repair API' -Port 3101 -HealthUrl 'http://127.0.0.1:3101/' -TimeoutSeconds 30
Start-IfStopped -Name 'Repair Admin' -Port 1888 -WorkingDirectory $repairRoot -Command $repairAdminCommand
$repairAdminReady = Wait-Service -Name 'Repair Admin' -Port 1888 -HealthUrl 'http://127.0.0.1:1888/' -TimeoutSeconds 30
Start-IfStopped -Name 'Repair Client' -Port 2888 -WorkingDirectory $repairRoot -Command $repairClientCommand
$repairClientReady = Wait-Service -Name 'Repair Client' -Port 2888 -HealthUrl 'http://127.0.0.1:2888/' -TimeoutSeconds 30

$ready = @(
  $cmsReady
  Wait-Service -Name 'Website (Nuxt)' -Port 4175 -HealthUrl 'http://127.0.0.1:4175/'
  $repairApiReady
  $repairAdminReady
  $repairClientReady
)

if (-not $NoBrowser -and -not ($ready -contains $false)) {
  foreach ($url in @(
    'http://127.0.0.1:8055/admin',
    'http://127.0.0.1:4175',
    'http://127.0.0.1:2888',
    'http://127.0.0.1:1888'
  )) {
    Start-Process $url
  }
  Write-Host 'Opened CMS, website, repair client, and repair admin.' -ForegroundColor Green
}
elseif (-not $NoBrowser) {
  Write-Warning 'One or more services are not ready; the browser was not opened.'
}

Write-Host "Launcher finished. Background service logs are in $outputRoot" -ForegroundColor Gray
Write-Host "LAN CMS: http://$lanAddress`:8055/admin" -ForegroundColor Cyan
Write-Host "LAN website: http://$lanAddress`:4175" -ForegroundColor Cyan
