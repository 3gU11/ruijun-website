$ErrorActionPreference = 'Stop'
$serviceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\.local\minio'))
$env:GOBIN = Join-Path $serviceRoot 'bin'
$env:GOPATH = Join-Path $serviceRoot 'gopath'
$env:GOCACHE = Join-Path $serviceRoot 'gocache'
$env:GOPROXY = 'https://goproxy.cn,direct'
& (Join-Path $serviceRoot 'go\bin\go.exe') install github.com/minio/minio@RELEASE.2025-10-15T17-29-55Z
if ($LASTEXITCODE -ne 0) { throw 'MinIO build failed.' }
