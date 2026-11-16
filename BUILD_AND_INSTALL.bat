@echo off
setlocal
cd /d "%~dp0"
title AndroidKit - Build APK
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build\build_apk.ps1" %*
if errorlevel 1 (
  echo.
  echo FAILED. Copy the red lines above and send them to Claude.
  pause
  exit /b 1
)
echo.
pause
