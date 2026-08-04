param(
  [string]$HostName = "127.0.0.1",
  [string]$Port = "3306",
  [string]$User = "root",
  [string]$Password = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$schema = Join-Path $PSScriptRoot "schema.sql"
$seed = Join-Path $PSScriptRoot "seed.sql"

if (-not (Get-Command mysql -ErrorAction SilentlyContinue)) {
  throw "mysql 命令未找到。请先安装 MySQL，并把 MySQL bin 目录加入 PATH。"
}

$mysqlArgs = @("-h", $HostName, "-P", $Port, "-u", $User, "--default-character-set=utf8mb4")
if ($Password) {
  $mysqlArgs += "-p$Password"
}

Write-Host "== 初始化 repair_system 数据库 =="
Get-Content -Raw -Encoding UTF8 $schema | & mysql @mysqlArgs
Get-Content -Raw -Encoding UTF8 $seed | & mysql @mysqlArgs

$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) {
  @"
USE_MYSQL=true
MYSQL_HOST=$HostName
MYSQL_PORT=$Port
MYSQL_USER=$User
MYSQL_PASSWORD=$Password
MYSQL_DATABASE=repair_system
MODEL_DICTIONARY_SCHEMA=rjfinshed
MODEL_DICTIONARY_TABLE=model_dictionary
PORT=3101
"@ | Set-Content -Encoding UTF8 $envFile
  Write-Host "已生成 .env"
} else {
  Write-Host ".env 已存在，未覆盖。请确认里面的 MySQL 配置。"
}

Write-Host "完成。"
