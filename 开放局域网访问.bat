@echo off
chcp 65001 >nul
title 开放局域网访问 - 瑞钧 CMS 官网
echo.
echo  本脚本开放两个端口的入站访问：
echo    4175  官网（含实时预览画布）
echo    8055  内容工作台
echo.
echo  范围限定为「本地子网」，即同一 WiFi / 交换机下的设备。
echo  不会对公网开放。
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

echo  正在删除旧的同名规则（如有）...
netsh advfirewall firewall delete rule name="Ruijun CMS - 官网 4175" >nul 2>&1
netsh advfirewall firewall delete rule name="Ruijun CMS - 工作台 8055" >nul 2>&1

echo  正在添加放行规则...
netsh advfirewall firewall add rule name="Ruijun CMS - 官网 4175" dir=in action=allow protocol=TCP localport=4175 remoteip=LocalSubnet
netsh advfirewall firewall add rule name="Ruijun CMS - 工作台 8055" dir=in action=allow protocol=TCP localport=8055 remoteip=LocalSubnet

echo.
echo  ============================================================
echo   完成。局域网设备现在可以访问：
echo.
echo     官网      http://本机IP:4175
echo     工作台    http://本机IP:8055/admin
echo.
echo   本机 IP 可用 ipconfig 查看（找 IPv4 地址，例如 172.21.8.140）。
echo.
echo   如需撤销，运行「关闭局域网访问.bat」。
echo  ============================================================
echo.
pause
