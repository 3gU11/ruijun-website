@echo off
setlocal
rem Keep this file ASCII-only. cmd.exe parses .bat files with the OEM code page
rem (936 on this machine), so a UTF-8 Chinese script name embedded here would be
rem decoded as mojibake and PowerShell would report that the file does not exist.
rem Locate the single launcher .ps1 next to this file instead of hard-coding it.
set "PS1="
for %%F in ("%~dp0*CMS*.ps1") do if exist "%%~fF" set "PS1=%%~fF"
if not defined PS1 for %%F in ("%~dp0*.ps1") do if exist "%%~fF" set "PS1=%%~fF"
if not defined PS1 (
  echo Launcher script not found next to this .bat.
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
if errorlevel 1 pause
