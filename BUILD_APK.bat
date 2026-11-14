@echo off
setlocal
cd /d "%~dp0"
title YT Download - Build APK
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build\build_apk.ps1" %*
if errorlevel 1 (
  echo.
  echo FAILED. See the messages above.
  pause
  exit /b 1
)
echo.
pause
