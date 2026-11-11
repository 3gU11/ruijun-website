$ErrorActionPreference = 'Stop'
$serviceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\.local\minio'))
$pidFile = Join-Path $serviceRoot 'minio.pid'
if (Test-Path -LiteralPath $pidFile) {
    $minioProcessId = [int](Get-Content -LiteralPath $pidFile)
    $process = Get-Process -Id $minioProcessId -ErrorAction SilentlyContinue
    if ($process -and $process.Path -eq (Join-Path $serviceRoot 'bin\minio.exe')) { Stop-Process -Id $minioProcessId }
    Remove-Item -LiteralPath $pidFile
}
Write-Host 'MinIO stopped.'
