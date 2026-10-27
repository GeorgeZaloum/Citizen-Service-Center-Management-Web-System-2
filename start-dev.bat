@echo off
rem Double-click to start the backend and the frontend. Options are passed on:
rem   start-dev.bat -Mock     frontend with the mock server only
rem   start-dev.bat -Setup    first run (install, migrate, seed)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1" %*
if errorlevel 1 pause
