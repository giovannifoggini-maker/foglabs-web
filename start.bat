@echo off
title FogLabs - Creative Technology Lab
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22+ non trovato.
  echo Installa Node.js 22+ e rilancia.
  pause
  exit /b 1
)
cd /d "%~dp0"
node server.js
pause
