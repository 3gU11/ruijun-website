$ErrorActionPreference = 'Stop'

$cmsRoot = Split-Path -Parent $PSScriptRoot
$workspaceRoot = Split-Path -Parent $cmsRoot
$outputRoot = Join-Path $workspaceRoot 'output'
$runner = Join-Path $PSScriptRoot 'run-local-directus.ps1'
$stdout = Join-Path $outputRoot 'cms-directus.stdout.log'
$stderr = Join-Path $outputRoot 'cms-directus.stderr.log'

New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

$allProcesses = @(Get-CimInstance Win32_Process)
$processIds = [System.Collections.Generic.HashSet[int]]::new()
$queue = [System.Collections.Generic.Queue[int]]::new()

foreach ($process in $allProcesses) {
  if ($process.CommandLine -and $process.CommandLine -like "*$runner*") {
    $queue.Enqueue([int]$process.ProcessId)
  }
}

$listener = Get-NetTCPConnection -LocalPort 8055 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  $owner = $allProcesses | Where-Object { $_.ProcessId -eq $listener.OwningProcess } | Select-Object -First 1
  if ($owner -and $owner.CommandLine -match 'directus[\\/]cli\.js\s+start') {
    $queue.Enqueue([int]$owner.ProcessId)
  }
}

while ($queue.Count -gt 0) {
  $currentId = $queue.Dequeue()
  if ($processIds.Add($currentId)) {
    foreach ($child in $allProcesses | Where-Object { $_.ParentProcessId -eq $currentId }) {
      $queue.Enqueue([int]$child.ProcessId)
    }
  }
}

foreach ($processId in @($processIds) | Sort-Object -Descending) {
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Milliseconds 800

Start-Process powershell.exe `
  -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $runner) `
  -WorkingDirectory $cmsRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr

$deadline = (Get-Date).AddSeconds(30)
do {
  Start-Sleep -Milliseconds 500
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8055/server/health' -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      Write-Output '{"restarted":true,"healthy":true}'
      exit 0
    }
  } catch {
    # The process is still starting.
  }
} while ((Get-Date) -lt $deadline)

throw "Directus did not become healthy within 30 seconds. See $stderr"
