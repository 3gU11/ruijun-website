$ErrorActionPreference = "Continue"

Write-Host "== Repair system local environment check =="

function Show-CommandVersion($Name, $VersionArgs) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    Write-Host "${Name}: NOT FOUND"
    return
  }

  Write-Host "${Name}: $($cmd.Source)"
  & $Name @VersionArgs
}

Show-CommandVersion "git" @("--version")
Show-CommandVersion "node" @("--version")
Show-CommandVersion "npm.cmd" @("--version")
Show-CommandVersion "java" @("-version")
Show-CommandVersion "javac" @("-version")

Write-Host ""
Write-Host "JAVA_HOME=$env:JAVA_HOME"
