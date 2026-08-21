@echo off
title That Fake Ad Game
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
if errorlevel 1 (
  echo.
  echo Nao deu pra abrir o jogo. Se o Windows bloquear o script, clica com o direito no serve.ps1, Propriedades, e marca Desbloquear.
  pause
)
