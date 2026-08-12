$ErrorActionPreference='Stop'
Get-Content -LiteralPath 'D:\CURSORpj\gaunwang\website\.env.local' | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { Set-Item -Path "Env:$($matches[1].Trim())" -Value $matches[2] } }
$env:NITRO_HOST='0.0.0.0'
$env:NITRO_PORT='4300'
& 'C:\Program Files\nodejs\node.exe' 'D:\CURSORpj\gaunwang\website\.output\server\index.mjs'
