param(
  [ValidateRange(1, 60)]
  [int]$IntervalMinutes = 5
)

$ErrorActionPreference = 'Stop'
$cmsRoot = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $PSScriptRoot 'run-notification-worker-local.ps1'
if (-not (Test-Path -LiteralPath (Join-Path $cmsRoot '.env.local'))) {
  throw 'cms/.env.local is required before installing the notification worker task.'
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$runner`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 4)
Register-ScheduledTask -TaskName 'Ruijun CMS notification worker' -Action $action -Trigger $trigger -Settings $settings -Description 'Delivers queued sales-lead notifications with a least-privilege Directus worker account.' -Force | Out-Null
Write-Output "Installed Ruijun CMS notification worker every $IntervalMinutes minute(s)."
