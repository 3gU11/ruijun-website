@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0启动CMS官网维修系统.ps1"
if errorlevel 1 pause
