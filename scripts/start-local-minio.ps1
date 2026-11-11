$ErrorActionPreference = 'Stop'
$serviceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\.local\minio'))
$binary = Join-Path $serviceRoot 'bin\minio.exe'
if (!(Test-Path -LiteralPath $binary)) { throw 'MinIO executable is missing.' }
$config = Get-Content -LiteralPath (Join-Path $serviceRoot 'credentials.json') -Raw | ConvertFrom-Json
$env:MINIO_ROOT_USER = $config.username
$env:MINIO_ROOT_PASSWORD = $config.password
try {
    $health = Invoke-WebRequest 'http://127.0.0.1:9000/minio/health/live' -UseBasicParsing -TimeoutSec 2
    if ($health.StatusCode -eq 200) { Write-Host 'MinIO is already running: http://127.0.0.1:9001'; return }
} catch {}
$process = Start-Process -FilePath $binary -ArgumentList @('server', ('"' + (Join-Path $serviceRoot 'data') + '"'), '--address', '127.0.0.1:9000', '--console-address', '127.0.0.1:9001') -WorkingDirectory $serviceRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $serviceRoot 'stdout.log') -RedirectStandardError (Join-Path $serviceRoot 'stderr.log') -PassThru
$process.Id | Set-Content -LiteralPath (Join-Path $serviceRoot 'minio.pid')
Remove-Item Env:MINIO_ROOT_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:MINIO_ROOT_USER -ErrorAction SilentlyContinue
$ready = $false
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    if ($process.HasExited) { throw ('MinIO exited. Check ' + (Join-Path $serviceRoot 'stderr.log')) }
    try {
        $health = Invoke-WebRequest 'http://127.0.0.1:9000/minio/health/ready' -UseBasicParsing -TimeoutSec 2
        if ($health.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
    Start-Sleep -Milliseconds 500
}
if (!$ready) { throw 'MinIO did not become ready. Check its logs.' }
Write-Host 'MinIO console: http://127.0.0.1:9001'
Write-Host ('Credentials: ' + (Join-Path $serviceRoot 'credentials.json'))
