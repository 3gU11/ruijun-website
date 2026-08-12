$ErrorActionPreference='Stop'
Get-Content -LiteralPath 'D:\CURSORpj\gaunwang\cms\.env.local' | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { Set-Item -Path "Env:$($matches[1].Trim())" -Value $matches[2] } }
& 'D:\CURSORpj\gaunwang\cms\.tools\node-v22.23.2-win-x64\node.exe' 'D:\CURSORpj\gaunwang\cms\node_modules\directus\cli.js' start
