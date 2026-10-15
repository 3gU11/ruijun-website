@echo off
chcp 65001 >nul
title 关闭局域网访问 - 瑞钧 CMS 官网
echo.
echo  本脚本删除之前添加的两条入站放行规则，
echo  恢复为「局域网设备无法访问」的默认状态。
echo.
echo  需要管理员权限。若弹出 UAC 提示请选择「是」。
echo.
pause
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo  [错误] 当前不是管理员。
  echo         请关闭本窗口，右键本文件 -^> 「以管理员身份运行」。
  echo.
  pause
  exit /b 1
)

netsh advfirewall firewall delete rule name="Ruijun CMS - 官网 4175"
netsh advfirewall firewall delete rule name="Ruijun CMS - 工作台 8055"

echo.
echo  ============================================================
echo   已撤销。局域网设备不再能访问 4175 / 8055。
echo   本机访问不受影响。
echo  ============================================================
echo.
pause
