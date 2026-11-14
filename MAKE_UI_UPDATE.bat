@echo off
setlocal
cd /d "%~dp0"
title YT Download - Make UI update
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build\make_ui_update.ps1" %*
if errorlevel 1 (
  echo.
  echo FAILED. See the messages above.
  pause
  exit /b 1
)
echo.
pause
