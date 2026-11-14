@echo off
setlocal
cd /d "%~dp0"
title YT Download - Key for GitHub
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build\make_github_key.ps1"
if errorlevel 1 (
  echo.
  echo FAILED. See the messages above.
)
echo.
pause
